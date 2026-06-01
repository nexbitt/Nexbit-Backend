import express from 'express';
const router = express.Router();
import repartoController from '../controllers/repartoController.js';
import { verificarToken } from '../middleware/authMiddleware.js';

// Rutas de reparto - Panel del Repartidor
router.get('/pedidos', verificarToken,
    /*  #swagger.tags = ['Reparto']
        #swagger.summary = 'Obtener los pedidos asignados al repartidor autenticado' */
    repartoController.obtenerPedidos
);

router.post('/pedidos/:id_pedido/aceptar', verificarToken,
    /*  #swagger.tags = ['Reparto']
        #swagger.summary = 'Aceptar un pedido asignado' */
    repartoController.aceptarPedido
);

router.post('/pedidos/:id_pedido/entregar', verificarToken,
    /*  #swagger.tags = ['Reparto']
        #swagger.summary = 'Marcar un pedido como entregado' */
    repartoController.entregarPedido
);

export default router;
