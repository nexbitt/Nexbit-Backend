import nodemailer from 'nodemailer';
import { buildOtpEmailHtml } from '../templates/otpEmail.js';

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    // Verificar conexión
    try {
      await transporter.verify();
      console.log('SMTP conectado correctamente');
    } catch {
      console.warn('Credenciales SMTP inválidas, usando Ethereal como fallback');
      transporter = null;
    }
  }

  if (!transporter) {
    const testAccount = await nodemailer.createTestAccount();
    console.log('Ethereal account creada:', testAccount.user);
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }

  return transporter;
}

export async function sendOtpEmail(to, otp) {
  const t = await getTransporter();

  const mailOptions = {
    from: `"Nexbit" <${process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@nexbit.com'}>`,
    to,
    subject: 'Código de verificación - Recuperar contraseña',
    html: buildOtpEmailHtml(otp),
  };

  const info = await t.sendMail(mailOptions);
  console.log('Email enviado:', info.messageId);

  if (info.messageId && process.env.NODE_ENV !== 'production') {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log('Vista previa (Ethereal):', previewUrl);
    }
  }

  return info;
}
