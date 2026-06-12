import express from 'express';
const router = express.Router();
import { recoverPassword, verifyOtp, resetPassword } from '../controllers/authController.js';

router.post('/recover-password',
    /*  #swagger.tags = ['Autenticación']
        #swagger.summary = 'Solicitar código de recuperación de contraseña'
        #swagger.description = 'Genera un OTP de 6 dígitos, lo persiste con TTL de 5 min y lo envía por email.' */
    recoverPassword
);

router.post('/verify-otp',
    /*  #swagger.tags = ['Autenticación']
        #swagger.summary = 'Verificar código OTP'
        #swagger.description = 'Valida el código de 6 dígitos. Máximo 3 intentos fallidos antes de bloquear.' */
    verifyOtp
);

router.post('/reset-password',
    /*  #swagger.tags = ['Autenticación']
        #swagger.summary = 'Restablecer contraseña'
        #swagger.description = 'Actualiza la contraseña usando el token de verificación de un solo uso.' */
    resetPassword
);

export default router;
