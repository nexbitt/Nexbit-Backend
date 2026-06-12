import nodemailer from 'nodemailer';
import { buildOtpEmailHtml } from '../templates/otpEmail.js';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOtpEmail(to, otp) {
  const mailOptions = {
    from: `"Nexbit" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject: 'Código de verificación - Recuperar contraseña',
    html: buildOtpEmailHtml(otp),
  };

  return transporter.sendMail(mailOptions);
}
