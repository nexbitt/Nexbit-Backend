import express from 'express';
const router = express.Router();
import proveedorController from '../controllers/proveedorController.js';
import { verificarToken } from '../middleware/authMiddleware.js';

router.get('/', verificarToken,
    /*  #swagger.tags = ['Proveedores']
        #swagger.summary = 'Listar todos los proveedores' */
    proveedorController.getAll
);

router.get('/:id', verificarToken,
    /*  #swagger.tags = ['Proveedores']
        #swagger.summary = 'Obtener un proveedor por ID' */
    proveedorController.getOne
);

router.post('/', verificarToken,
    /*  #swagger.tags = ['Proveedores']
        #swagger.summary = 'Crear un nuevo proveedor' */
    proveedorController.store
);

router.put('/:id', verificarToken,
    /*  #swagger.tags = ['Proveedores']
        #swagger.summary = 'Actualizar un proveedor' */
    proveedorController.update
);

router.delete('/:id', verificarToken,
    /*  #swagger.tags = ['Proveedores']
        #swagger.summary = 'Eliminar un proveedor' */
    proveedorController.destroy
);

export default router;