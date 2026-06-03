import express from 'express';
const router = express.Router();
import chatController from '../controllers/chatController.js';
import { verificarToken } from '../middleware/authMiddleware.js';

router.get('/conversacion/pedido/:pedido_id', verificarToken, chatController.obtenerOCrearConversacion);
router.post('/conversacion/:conversacion_id/mensajes', verificarToken, chatController.enviarMensaje);
router.put('/conversacion/:conversacion_id/leidos', verificarToken, chatController.marcarLeidos);
router.get('/mensajes/no-leidos', verificarToken, chatController.obtenerMensajesNoLeidos);
router.get('/conversaciones/admin', verificarToken, chatController.listarConversacionesAdmin);

export default router;