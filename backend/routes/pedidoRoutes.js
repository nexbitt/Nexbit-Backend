import express from 'express';
const router = express.Router();
import pedidoController from '../controllers/pedidoController.js';
import { verificarToken } from '../middleware/authMiddleware.js';
import { uploadComprobante } from '../middleware/uploadMiddleware.js';

router.get('/', verificarToken,
    /*  #swagger.tags = ['Pedidos']
        #swagger.summary = 'Listar todos los pedidos' */
    pedidoController.getAll
);

router.get('/en-revision', verificarToken,
    /*  #swagger.tags = ['Pedidos']
        #swagger.summary = 'Listar pedidos en revisión' */
    pedidoController.pedidosEnRevision
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

router.get('/usuario/:usuario_id/verificar-pendiente', verificarToken,
    /*  #swagger.tags = ['Pedidos']
        #swagger.summary = 'Verificar si usuario tiene pedido activo' */
    pedidoController.verificarPedidoActivo
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

router.post('/:id/subir-comprobante', verificarToken, uploadComprobante.single('comprobante'),
    /*  #swagger.tags = ['Pedidos']
        #swagger.summary = 'Subir comprobante de pago' */
    pedidoController.subirComprobante
);

router.put('/:id/aprobar-pago', verificarToken,
    /*  #swagger.tags = ['Pedidos']
        #swagger.summary = 'Aprobar pago de un pedido' */
    pedidoController.aprobarPago
);

router.put('/:id/enviar-comentario', verificarToken,
    /*  #swagger.tags = ['Pedidos']
        #swagger.summary = 'Enviar comentario sin cambiar estado' */
    pedidoController.enviarComentario
);

router.put('/:id/rechazar-pago', verificarToken,
    /*  #swagger.tags = ['Pedidos']
        #swagger.summary = 'Rechazar pago de un pedido' */
    pedidoController.rechazarPago
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