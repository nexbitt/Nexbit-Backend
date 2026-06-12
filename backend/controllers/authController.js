import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../config/prisma.js';
import Usuario from '../models/usuarioModel.js';
import { sendOtpEmail } from '../utils/email.js';

const SECRET_KEY = process.env.JWT_SECRET || 'mi_clave_secreta_super_segura';

/**
 * POST /api/auth/recover-password
 * Step 1: Valida email, genera OTP de 6 dígitos criptográfico,
 *          persiste con TTL de 5 min y envía por correo.
 */
const recoverPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, error: 'EMAIL_REQUIRED', message: 'El correo electrónico es requerido.' });
        }

        const user = await Usuario.findByEmail(email);
        if (!user) {
            return res.status(404).json({ success: false, error: 'USER_NOT_FOUND', message: 'Usuario no encontrado.' });
        }

        const otp = crypto.randomInt(100000, 999999).toString();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await prisma.password_resets.updateMany({
            where: { usuario_id: user.id_usuario, verified: false },
            data: { expires_at: new Date(0) }
        });

        await prisma.password_resets.create({
            data: {
                usuario_id: user.id_usuario,
                otp_hash: otpHash,
                expires_at: expiresAt
            }
        });

        try {
            await sendOtpEmail(email, otp);
        } catch (emailError) {
            console.error('Error al enviar email:', emailError.message);
        }

        return res.status(200).json({ success: true, data: null, message: 'Código enviado correctamente.' });

    } catch (error) {
        return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
    }
};

/**
 * POST /api/auth/verify-otp
 * Step 2: Valida el código OTP, con control de intentos (max 3).
 *         Retorna un reset token de un solo uso en caso de éxito.
 */
const verifyOtp = async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) {
            return res.status(400).json({ success: false, error: 'CODE_REQUIRED', message: 'Correo y código son requeridos.' });
        }

        const user = await Usuario.findByEmail(email);
        if (!user) {
            return res.status(400).json({ success: false, error: 'INVALID_CODE', message: 'Código inválido o expirado.' });
        }

        const resetRecord = await prisma.password_resets.findFirst({
            where: {
                usuario_id: user.id_usuario,
                verified: false,
                expires_at: { gt: new Date() }
            },
            orderBy: { created_at: 'desc' }
        });

        if (!resetRecord) {
            return res.status(400).json({ success: false, error: 'OTP_EXPIRED', message: 'Código expirado.' });
        }

        const isValid = await bcrypt.compare(code, resetRecord.otp_hash);
        if (!isValid) {
            const newAttempts = resetRecord.attempts + 1;

            if (newAttempts >= 3) {
                await prisma.password_resets.update({
                    where: { id_reset: resetRecord.id_reset },
                    data: { attempts: newAttempts, expires_at: new Date(0) }
                });
                return res.status(400).json({ success: false, error: 'OTP_BLOCKED', message: 'Código bloqueado por demasiados intentos fallidos.' });
            }

            await prisma.password_resets.update({
                where: { id_reset: resetRecord.id_reset },
                data: { attempts: newAttempts }
            });

            return res.status(400).json({ success: false, error: 'INVALID_CODE', message: 'Código incorrecto.' });
        }

        await prisma.password_resets.update({
            where: { id_reset: resetRecord.id_reset },
            data: { verified: true }
        });

        const resetToken = jwt.sign(
            { userId: user.id_usuario, purpose: 'password_reset', resetId: resetRecord.id_reset },
            SECRET_KEY,
            { expiresIn: '5m' }
        );

        return res.status(200).json({ success: true, data: { token: resetToken }, message: 'Código verificado correctamente.' });

    } catch (error) {
        return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
    }
};

/**
 * POST /api/auth/reset-password
 * Step 3: Valida el reset token y la nueva contraseña, aplica hash y actualiza.
 */
const resetPassword = async (req, res) => {
    try {
        const { email, token, newPassword } = req.body;

        if (!email || !token || !newPassword) {
            return res.status(400).json({ success: false, error: 'FIELDS_REQUIRED', message: 'Correo, token y nueva contraseña son requeridos.' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, error: 'WEAK_PASSWORD', message: 'La contraseña debe tener al menos 8 caracteres.' });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, SECRET_KEY);
            if (decoded.purpose !== 'password_reset') {
                return res.status(400).json({ success: false, error: 'TOKEN_INVALID', message: 'Token de verificación inválido.' });
            }
        } catch {
            return res.status(400).json({ success: false, error: 'TOKEN_EXPIRED', message: 'Token de verificación expirado. Vuelve a verificar tu código.' });
        }

        const user = await Usuario.findByEmail(email);
        if (!user || user.id_usuario !== decoded.userId) {
            return res.status(400).json({ success: false, error: 'INVALID_REQUEST', message: 'Solicitud inválida.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.usuarios.update({
            where: { id_usuario: user.id_usuario },
            data: { password: hashedPassword }
        });

        await prisma.password_resets.deleteMany({
            where: { usuario_id: user.id_usuario }
        });

        return res.status(200).json({ success: true, data: null, message: 'Contraseña actualizada correctamente.' });

    } catch (error) {
        return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
    }
};

export { recoverPassword, verifyOtp, resetPassword };
