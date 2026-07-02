import express from 'express';
const router = express.Router();
import pedidoController from '../controllers/pedidoController.js';
import { verificarToken, verificarRol } from '../middleware/authMiddleware.js';
import { uploadComprobante } from '../middleware/uploadMiddleware.js';

// Rutas para clientes
router.post('/checkout', verificarToken, verificarRol('Cliente', 'Administrador'),
    /*  #swagger.tags = ['Pedidos']
        #swagger.summary = 'Realizar checkout (crear pedido desde el carrito)' */
    pedidoController.checkout
);

router.post('/:id/subir-comprobante', verificarToken, verificarRol('Cliente', 'Administrador'), uploadComprobante.single('comprobante'),
    /*  #swagger.tags = ['Pedidos']
        #swagger.summary = 'Subir comprobante de pago' */
    pedidoController.subirComprobante
);

router.put('/:id/cancelar', verificarToken, verificarRol('Cliente', 'Administrador'),
    /*  #swagger.tags = ['Pedidos']
        #swagger.summary = 'Cancelar un pedido' */
    pedidoController.cancelar
);

// Rutas generales (admin puede ver todo, cliente solo sus pedidos)
router.get('/', verificarToken,
    /*  #swagger.tags = ['Pedidos']
        #swagger.summary = 'Listar todos los pedidos' */
    pedidoController.getAll
);

router.get('/en-revision', verificarToken, verificarRol('Administrador'),
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

// Importante: /usuario/trash debe ir ANTES que /usuario/:usuario_id
// para evitar que Express capture "trash" como un :usuario_id
router.get('/usuario/trash', verificarToken,
    /*  #swagger.tags = ['Pedidos']
        #swagger.summary = 'Listar pedidos en la papelera del usuario' */
    pedidoController.getTrash
);

router.get('/usuario/:usuario_id', verificarToken,
    /*  #swagger.tags = ['Pedidos']
        #swagger.summary = 'Obtener pedidos de un usuario' */
    pedidoController.getMisPedidos
);

router.post('/', verificarToken,
    /*  #swagger.tags = ['Pedidos']
        #swagger.summary = 'Crear un nuevo pedido manualmente' */
    pedidoController.store
);

router.put('/:id/aprobar-pago', verificarToken, verificarRol('Administrador'),
    /*  #swagger.tags = ['Pedidos']
        #swagger.summary = 'Aprobar pago de un pedido' */
    pedidoController.aprobarPago
);

router.put('/:id/enviar-comentario', verificarToken, verificarRol('Administrador'),
    /*  #swagger.tags = ['Pedidos']
        #swagger.summary = 'Enviar comentario sin cambiar estado' */
    pedidoController.enviarComentario
);

router.put('/:id/rechazar-pago', verificarToken, verificarRol('Administrador'),
    /*  #swagger.tags = ['Pedidos']
        #swagger.summary = 'Rechazar pago de un pedido' */
    pedidoController.rechazarPago
);

router.put('/:id', verificarToken,
    /*  #swagger.tags = ['Pedidos']
        #swagger.summary = 'Actualizar un pedido' */
    pedidoController.update
);

router.delete('/:id', verificarToken,
    /*  #swagger.tags = ['Pedidos']
        #swagger.summary = 'Eliminar un pedido' */
    pedidoController.destroy
);

// Soft-delete (borrado lógico) para clientes
router.put('/:id/eliminar', verificarToken, verificarRol('Cliente', 'Administrador'),
    /*  #swagger.tags = ['Pedidos']
        #swagger.summary = 'Mover pedido a la papelera (borrado lógico)' */
    pedidoController.softDelete
);

// Restaurar pedido de la papelera
router.put('/:id/restaurar', verificarToken, verificarRol('Cliente', 'Administrador'),
    /*  #swagger.tags = ['Pedidos']
        #swagger.summary = 'Restaurar pedido de la papelera' */
    pedidoController.restore
);

export default router;