import express from 'express';
const router = express.Router();
import repartoController from '../controllers/repartoController.js';
import { verificarToken, verificarRol } from '../middleware/authMiddleware.js';

router.get('/disponibles', verificarToken, verificarRol('Repartidor'),
    repartoController.obtenerDisponibles
);

router.get('/activo', verificarToken, verificarRol('Repartidor'),
    repartoController.obtenerActivo
);

router.get('/stats', verificarToken, verificarRol('Repartidor'),
    repartoController.obtenerStats
);

router.get('/historial', verificarToken, verificarRol('Repartidor'),
    repartoController.obtenerHistorial
);

router.post('/:id_pedido/tomar', verificarToken, verificarRol('Repartidor'),
    repartoController.tomarPedido
);

router.put('/:id_pedido/en-camino', verificarToken, verificarRol('Repartidor'),
    repartoController.marcarEnCamino
);

router.post('/:id_pedido/entregar', verificarToken, verificarRol('Repartidor'),
    repartoController.confirmarEntrega
);

router.put('/:id_pedido/cancelar', verificarToken, verificarRol('Repartidor'),
    repartoController.cancelarPedido
);

router.post('/:id_pedido/problema', verificarToken, verificarRol('Repartidor'),
    repartoController.reportarProblema
);

router.get('/zonas-calientes', verificarToken, verificarRol('Repartidor'),
    repartoController.zonasCalientes
);

export default router;
