import express from 'express';
const router = express.Router();
import repartoController from '../controllers/repartoController.js';
import { verificarToken, verificarRol } from '../middleware/authMiddleware.js';

router.get('/disponibles', verificarToken, verificarRol('Repartidor'),
    /*  #swagger.tags = ['Reparto']
        #swagger.summary = 'Obtener pedidos disponibles para el repartidor' */
    repartoController.obtenerDisponibles
);

router.get('/activo', verificarToken, verificarRol('Repartidor'),
    /*  #swagger.tags = ['Reparto']
        #swagger.summary = 'Obtener pedido actualmente asignado al repartidor' */
    repartoController.obtenerActivo
);

router.get('/stats', verificarToken, verificarRol('Repartidor'),
    /*  #swagger.tags = ['Reparto']
        #swagger.summary = 'Obtener estadísticas del repartidor' */
    repartoController.obtenerStats
);

router.get('/historial', verificarToken, verificarRol('Repartidor'),
    /*  #swagger.tags = ['Reparto']
        #swagger.summary = 'Obtener historial de entregas del repartidor' */
    repartoController.obtenerHistorial
);

router.post('/:id_pedido/tomar', verificarToken, verificarRol('Repartidor'),
    /*  #swagger.tags = ['Reparto']
        #swagger.summary = 'Tomar un pedido para entrega' */
    repartoController.tomarPedido
);

router.put('/:id_pedido/en-camino', verificarToken, verificarRol('Repartidor'),
    /*  #swagger.tags = ['Reparto']
        #swagger.summary = 'Marcar pedido como en camino' */
    repartoController.marcarEnCamino
);

router.post('/:id_pedido/entregar', verificarToken, verificarRol('Repartidor'),
    /*  #swagger.tags = ['Reparto']
        #swagger.summary = 'Confirmar entrega del pedido' */
    repartoController.confirmarEntrega
);

router.put('/:id_pedido/cancelar', verificarToken, verificarRol('Repartidor'),
    /*  #swagger.tags = ['Reparto']
        #swagger.summary = 'Cancelar entrega de un pedido' */
    repartoController.cancelarPedido
);

router.post('/:id_pedido/problema', verificarToken, verificarRol('Repartidor'),
    /*  #swagger.tags = ['Reparto']
        #swagger.summary = 'Reportar problema con entrega' */
    repartoController.reportarProblema
);

router.get('/zonas-calientes', verificarToken, verificarRol('Repartidor'),
    /*  #swagger.tags = ['Reparto']
        #swagger.summary = 'Obtener zonas de alto volumen de entregas' */
    repartoController.zonasCalientes
);

export default router;
