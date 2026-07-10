/**
 * @file usuarioController.js
 * @description Controlador para la gestión de usuarios y autenticación.
 */
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import Usuario from '../models/usuarioModel.js';
import { success, error, notFound, badRequest, unauthorized, forbidden } from '../utils/responseHelper.js';

const SECRET_KEY = process.env.JWT_SECRET || 'mi_clave_secreta_super_segura';

// ─── Opciones de la cookie httpOnly ─────────────────────────────────────────
const cookieOptions = {
    httpOnly: true,           // JavaScript del cliente NO puede leerla (protege vs XSS)
    secure: process.env.NODE_ENV === 'production', // HTTPS solo en producción
    sameSite: 'lax',          // Protección CSRF básica
    maxAge: 24 * 60 * 60 * 1000 // 24 horas en millisegundos
};

function generarToken(payload) {
    return jwt.sign(payload, SECRET_KEY, { expiresIn: '24h' });
}

// ─── CRUD Usuarios ───────────────────────────────────────────────────────────
const getAll = async (req, res) => {
    try {
        const data = await Usuario.findAll();
        success(res, data);
    } catch (err) {
        error(res, 'SERVER_ERROR', err.message);
    }
};

const getOne = async (req, res) => {
    try {
        const user = await Usuario.findById(req.params.id);
        if (!user) return notFound(res, 'Usuario');
        success(res, user);
    } catch (err) {
        error(res, 'SERVER_ERROR', err.message);
    }
};

const store = async (req, res) => {
    try {
        const { rol_id, nombre, email, password, tipo_documento, numero_documento, telefono, direccion } = req.body;
        if (!rol_id || !nombre || !email || !password) {
            return badRequest(res, 'Faltan campos obligatorios');
        }

        const roleObj = await Usuario.findRoleById(rol_id);
        if (!roleObj) {
            return badRequest(res, 'El rol especificado no existe.');
        }

        const isRolAdministrativo = roleObj.nombre.toLowerCase().includes('admin') || 
                                    roleObj.nombre.toLowerCase().includes('administrador');

        if (isRolAdministrativo) {
            let token = null;
            if (req.cookies && req.cookies.token) {
                token = req.cookies.token;
            }
            if (!token) {
                const authHeader = req.headers['authorization'];
                if (authHeader && authHeader.startsWith('Bearer ')) {
                    token = authHeader.split(' ')[1];
                }
            }
            if (!token) {
                return unauthorized(res, 'Acceso denegado. No se proporcionó un token de administrador para crear un usuario administrativo.');
            }
            try {
                const decoded = jwt.verify(token, SECRET_KEY);
                const creador = await Usuario.findById(decoded.userId);
                if (!creador || !creador.rol_nombre || !creador.rol_nombre.toLowerCase().includes('admin')) {
                    return forbidden(res, 'Solo un administrador puede crear usuarios con privilegios administrativos.');
                }
            } catch (jwtError) {
                if (jwtError.name === 'TokenExpiredError') {
                    return unauthorized(res, 'Token de administrador expirado. Por favor, inicia sesión de nuevo.');
                }
                return forbidden(res, 'Token de administrador inválido.');
            }
        }

        const id = await Usuario.create({ rol_id, nombre, email, password, tipo_documento, numero_documento, telefono, direccion });
        success(res, { id_usuario: id }, 'Usuario creado con éxito', 201);
    } catch (err) {
        error(res, 'SERVER_ERROR', err.message);
    }
};

const update = async (req, res) => {
    try {
        const { id } = req.params;
        const actualizado = await Usuario.update(id, req.body);
        if (!actualizado) return notFound(res, 'Usuario');
        success(res, null, 'Usuario actualizado correctamente');
    } catch (err) {
        error(res, 'SERVER_ERROR', err.message);
    }
};

const getRoles = async (req, res) => {
    try {
        const roles = await Usuario.getRoles();
        success(res, roles);
    } catch (err) {
        error(res, 'SERVER_ERROR', err.message);
    }
};

const destroy = async (req, res) => {
    try {
        const { id } = req.params;
        const eliminado = await Usuario.delete(id);
        if (!eliminado) return notFound(res, 'Usuario');
        success(res, null, 'Usuario eliminado físicamente');
    } catch (err) {
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
            return badRequest(res, 'No se puede eliminar este usuario porque ya tiene registros asociados.');
        }
        error(res, 'SERVER_ERROR', err.message);
    }
};

// ─── Autenticación ────────────────────────────────────────────────────────────
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await Usuario.findByEmail(email);

        const passwordValida = user && await bcrypt.compare(password, user.password);
        if (!passwordValida) {
            return unauthorized(res, 'Correo o contraseña incorrectos');
        }
        if (!user.activo) {
            return forbidden(res, 'La cuenta está inactiva.');
        }

        delete user.password;

        const payload = { userId: user.id_usuario, user: user.nombre, rol_id: user.rol_id };
        const token = generarToken(payload);

        res.cookie('token', token, cookieOptions);

        success(res, { user, token }, '¡Inicio de sesión exitoso!');
    } catch (err) {
        error(res, 'SERVER_ERROR', err.message);
    }
};

const getMe = async (req, res) => {
    try {
        const user = await Usuario.findById(req.usuario.userId);
        if (!user) return notFound(res, 'Usuario');

        delete user.password;
        success(res, user);
    } catch (err) {
        error(res, 'SERVER_ERROR', err.message);
    }
};

const logout = (req, res) => {
    res.clearCookie('token', { httpOnly: true, sameSite: 'lax' });
    success(res, null, 'Sesión cerrada correctamente');
};

const verificarContrasena = async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) {
            return badRequest(res, 'La contraseña es requerida');
        }

        const user = await Usuario.findById(req.usuario.userId);
        if (!user) {
            return notFound(res, 'Usuario');
        }

        const valida = await bcrypt.compare(password, user.password);
        if (!valida) {
            return unauthorized(res, 'Contraseña incorrecta');
        }

        success(res, { valida: true }, 'Identidad confirmada');
    } catch (err) {
        error(res, 'SERVER_ERROR', err.message);
    }
};

const updateSecure = async (req, res) => {
    try {
        const { id } = req.params;
        const { current_password, ...data } = req.body;

        const esAdmin = req.usuario.rol_id === 1;
        const esPropio = Number(id) === req.usuario.userId;

        if (!esAdmin && !esPropio) {
            return forbidden(res, 'No puedes modificar los datos de otro usuario');
        }

        const user = await Usuario.findById(id);
        if (!user) {
            return notFound(res, 'Usuario');
        }

        // Solo se exige la contraseña actual cuando el usuario edita SU PROPIO perfil.
        // Un admin editando a otro usuario no conoce (ni debe conocer) esa contraseña.
        if (esPropio) {
            if (!current_password) {
                return badRequest(res, 'Debes proporcionar tu contraseña actual para guardar los cambios');
            }

            const valida = await bcrypt.compare(current_password, user.password);
            if (!valida) {
                return unauthorized(res, 'Contraseña actual incorrecta. No se guardaron los cambios.');
            }
        }

        const actualizado = await Usuario.update(id, data);
        if (!actualizado) return notFound(res, 'Usuario');

        success(res, null, 'Usuario actualizado correctamente');
    } catch (err) {
        error(res, 'SERVER_ERROR', err.message);
    }
};

export default { getAll, getOne, store, update: updateSecure, getRoles, destroy, login, logout, getMe, verificarContrasena };