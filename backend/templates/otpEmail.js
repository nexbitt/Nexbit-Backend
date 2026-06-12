export function buildOtpEmailHtml(otp) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <div style="text-align: center; padding: 2rem 0;">
        <div style="width: 48px; height: 48px; background: #E6F4EA; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <h2 style="color: #111827; font-size: 24px; margin: 0;">Recuperar contraseña</h2>
        <p style="color: #64748B; font-size: 14px; margin-top: 8px;">
          Tu c&oacute;digo de verificaci&oacute;n de un solo uso (OTP):
        </p>
        <div style="background: #F9FAFB; border: 1px solid #E2E8F0; border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0; letter-spacing: 12px; font-size: 32px; font-weight: 700; color: #111827; text-align: center;">
          ${otp}
        </div>
        <p style="color: #94A3B8; font-size: 12px;">
          Este c&oacute;digo expira en 5 minutos. Si no solicitaste este cambio, ignora este mensaje.
        </p>
      </div>
      <div style="border-top: 1px solid #E2E8F0; padding-top: 1rem; text-align: center; font-size: 12px; color: #94A3B8;">
        Nexbit - RematesPaisa
      </div>
    </div>
  `;
}
