import express from 'express';
const router = express.Router();
import repartidorController from '../controllers/repartidorController.js';
import { verificarToken } from '../middleware/authMiddleware.js';

// Rutas para repartidores - protegidas
router.get('/', verificarToken,
    /*  #swagger.tags = ['Repartidores']
        #swagger.summary = 'Listar todos los repartidores' */
    repartidorController.getAll
);

router.get('/pedidos-sin-asignar', verificarToken,
    /*  #swagger.tags = ['Repartidores']
        #swagger.summary = 'Obtener pedidos sin repartidor asignado' */
    repartidorController.getPedidosSinAsignar
);

router.get('/:id', verificarToken,
    /*  #swagger.tags = ['Repartidores']
        #swagger.summary = 'Obtener un repartidor por ID' */
    repartidorController.getById
);

// Activar/Desactivar repartidor
router.put('/:id/activo', verificarToken,
    /*  #swagger.tags = ['Repartidores']
        #swagger.summary = 'Activar o desactivar un repartidor' */
    repartidorController.toggleActivo
);

// Rutas relacionadas con pedidos
router.post('/:id/asignar-pedido', verificarToken,
    /*  #swagger.tags = ['Repartidores']
        #swagger.summary = 'Asignar un pedido a un repartidor' */
    repartidorController.asignarPedido
);

router.put('/pedidos/:pedidoId/desasignar', verificarToken,
    /*  #swagger.tags = ['Repartidores']
        #swagger.summary = 'Desasignar un pedido de su repartidor' */
    repartidorController.desasignarPedido
);

router.put('/pedidos/:pedidoId/estado', verificarToken,
    /*  #swagger.tags = ['Repartidores']
        #swagger.summary = 'Cambiar el estado de un pedido asignado' */
    repartidorController.cambiarEstadoPedido
);

export default router;
