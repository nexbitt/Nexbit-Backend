import express from 'express';
const router = express.Router();
import pedidoController from '../controllers/pedidoController.js';
import { verificarToken } from '../middleware/authMiddleware.js';

router.get('/', verificarToken,
    /*  #swagger.tags = ['Pedidos']
        #swagger.summary = 'Listar todos los pedidos' */
    pedidoController.getAll
);

router.get('/:id/ticket', verificarToken,
    /*  #swagger.tags = ['Pedidos']
        #swagger.summary = 'Obtener ticket/recibo de un pedido' */
    pedidoController.getTicket
);

router.get('/:id', verificarToken,
    /*  #swagger.tags = ['Pedidos']
        #swagger.summary = 'Obtener un pedido por ID' */
    pedidoController.getOne
);

router.post('/checkout', verificarToken,
    /*  #swagger.tags = ['Pedidos']
        #swagger.summary = 'Realizar checkout (crear pedido desde el carrito)' */
    pedidoController.checkout
);

router.post('/', verificarToken,
    /*  #swagger.tags = ['Pedidos']
        #swagger.summary = 'Crear un nuevo pedido manualmente' */
    pedidoController.store
);

router.put('/:id', verificarToken,
    /*  #swagger.tags = ['Pedidos']
        #swagger.summary = 'Actualizar un pedido' */
    pedidoController.update
);

router.put('/:id/cancelar', verificarToken,
    /*  #swagger.tags = ['Pedidos']
        #swagger.summary = 'Cancelar un pedido' */
    pedidoController.cancelar
);

router.delete('/:id', verificarToken,
    /*  #swagger.tags = ['Pedidos']
        #swagger.summary = 'Eliminar un pedido' */
    pedidoController.destroy
);

export default router;