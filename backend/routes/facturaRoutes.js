import express from 'express';
const router = express.Router();
import facturaController from '../controllers/facturaController.js';
import { verificarToken } from '../middleware/authMiddleware.js';

router.get('/', verificarToken,
    /*  #swagger.tags = ['Facturas']
        #swagger.summary = 'Listar todas las facturas' */
    facturaController.getAll
);

router.get('/:id', verificarToken,
    /*  #swagger.tags = ['Facturas']
        #swagger.summary = 'Obtener una factura por ID' */
    facturaController.getOne
);

router.post('/', verificarToken,
    /*  #swagger.tags = ['Facturas']
        #swagger.summary = 'Crear una nueva factura' */
    facturaController.store
);

router.put('/:id', verificarToken,
    /*  #swagger.tags = ['Facturas']
        #swagger.summary = 'Actualizar una factura' */
    facturaController.update
);

router.delete('/:id', verificarToken,
    /*  #swagger.tags = ['Facturas']
        #swagger.summary = 'Eliminar una factura' */
    facturaController.destroy
);

export default router;