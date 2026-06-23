import express from 'express';
const router = express.Router();
import chatController from '../controllers/chatController.js';
import { verificarToken } from '../middleware/authMiddleware.js';

router.get('/conversacion/pedido/:pedido_id', verificarToken,
    /*  #swagger.tags = ['Chat']
        #swagger.summary = 'Obtener o crear conversación de un pedido' */
    chatController.obtenerOCrearConversacion
);

router.post('/conversacion/:conversacion_id/mensajes', verificarToken,
    /*  #swagger.tags = ['Chat']
        #swagger.summary = 'Enviar mensaje en conversación' */
    chatController.enviarMensaje
);

router.put('/conversacion/:conversacion_id/leidos', verificarToken,
    /*  #swagger.tags = ['Chat']
        #swagger.summary = 'Marcar mensajes como leídos' */
    chatController.marcarLeidos
);

router.get('/mensajes/no-leidos', verificarToken,
    /*  #swagger.tags = ['Chat']
        #swagger.summary = 'Obtener mensajes no leídos del usuario' */
    chatController.obtenerMensajesNoLeidos
);

router.get('/conversaciones/admin', verificarToken,
    /*  #swagger.tags = ['Chat']
        #swagger.summary = 'Listar conversaciones para administrador' */
    chatController.listarConversacionesAdmin
);

export default router;