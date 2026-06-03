import express from 'express';
const router = express.Router();
import repartoController from '../controllers/repartoController.js';
import { verificarToken } from '../middleware/authMiddleware.js';

router.get('/disponibles', verificarToken,
    repartoController.obtenerDisponibles
);

router.get('/activo', verificarToken,
    repartoController.obtenerActivo
);

router.get('/historial', verificarToken,
    repartoController.obtenerHistorial
);

router.post('/:id_pedido/tomar', verificarToken,
    repartoController.tomarPedido
);

router.put('/:id_pedido/en-camino', verificarToken,
    repartoController.marcarEnCamino
);

router.post('/:id_pedido/entregar', verificarToken,
    repartoController.confirmarEntrega
);

router.put('/:id_pedido/cancelar', verificarToken,
    repartoController.cancelarPedido
);

router.post('/:id_pedido/problema', verificarToken,
    repartoController.reportarProblema
);

router.get('/zonas-calientes', verificarToken,
    repartoController.zonasCalientes
);

export default router;
