import express from 'express';
const router = express.Router();
import carritoController from '../controllers/carritoController.js';
import { verificarToken } from '../middleware/authMiddleware.js';

router.get('/', verificarToken,
    /*  #swagger.tags = ['Carrito']
        #swagger.summary = 'Obtener el carrito del usuario' */
    carritoController.getCart
);

router.post('/add', verificarToken,
    /*  #swagger.tags = ['Carrito']
        #swagger.summary = 'Agregar producto al carrito' */
    carritoController.add
);

router.post('/clear', verificarToken,
    /*  #swagger.tags = ['Carrito']
        #swagger.summary = 'Vaciar el carrito' */
    carritoController.clear
);

router.post('/merge', verificarToken,
    /*  #swagger.tags = ['Carrito']
        #swagger.summary = 'Fusionar carrito local con el del servidor' */
    carritoController.merge
);

router.put('/update/:id_carrito', verificarToken,
    /*  #swagger.tags = ['Carrito']
        #swagger.summary = 'Actualizar cantidad de un ítem del carrito' */
    carritoController.update
);

router.delete('/remove/:producto_id', verificarToken,
    /*  #swagger.tags = ['Carrito']
        #swagger.summary = 'Eliminar un producto del carrito' */
    carritoController.remove
);

export default router;