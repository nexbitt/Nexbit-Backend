import express from 'express';
const router = express.Router();
import adminController from '../controllers/adminController.js';
import { verificarToken, verificarRol } from '../middleware/authMiddleware.js';

router.use(verificarToken, verificarRol('Administrador'));

router.get('/pedidos',
    /*  #swagger.tags = ['Admin']
        #swagger.summary = 'Listar todos los pedidos (admin)' */
    adminController.listarPedidos
);

router.get('/pedidos/:id',
    /*  #swagger.tags = ['Admin']
        #swagger.summary = 'Obtener detalles de un pedido (admin)' */
    adminController.obtenerPedido
);

router.patch('/pedidos/:id/gestion',
    /*  #swagger.tags = ['Admin']
        #swagger.summary = 'Gestionar un pedido (cambiar estado, asignar repartidor)' */
    adminController.gestionarPedido
);

export default router;
