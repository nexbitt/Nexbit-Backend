/**
 * @file productoRoutes.js
 * @description Definición de rutas para el recurso de productos.
 */
import express from 'express';
const router = express.Router();
import productoController from '../controllers/productoController.js';
import { verificarToken } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

// ── Ruta PÚBLICA: catálogo para usuarios e invitados (sin token) ──
router.get('/publico',
    /*  #swagger.tags = ['Productos']
        #swagger.summary = 'Catálogo público de productos activos'
        #swagger.description = 'Devuelve solo productos activos sin campos sensibles. No requiere autenticación.' */
    productoController.getPublic
);

router.get('/public',
    /*  #swagger.tags = ['Productos']
        #swagger.summary = 'Catálogo público (alias inglés)' */
    productoController.getPublic
);

// ── Rutas protegidas (admin) ──────────────────────────────────────
router.get('/', verificarToken,
    /*  #swagger.tags = ['Productos']
        #swagger.summary = 'Listar todos los productos (admin)' */
    productoController.getAll
);

router.get('/:id',
    /*  #swagger.tags = ['Productos']
        #swagger.summary = 'Obtener un producto por ID' */
    productoController.getOne
);

// upload.single('imagen') procesa el campo "imagen" del formulario
router.post('/', verificarToken, upload.single('imagen'),
    /*  #swagger.tags = ['Productos']
        #swagger.summary = 'Crear un nuevo producto'
        #swagger.description = 'Soporta subida de imagen vía multipart/form-data con el campo "imagen".'
        #swagger.consumes = ['multipart/form-data'] */
    productoController.store
);

router.put('/:id', verificarToken, upload.single('imagen'),
    /*  #swagger.tags = ['Productos']
        #swagger.summary = 'Actualizar un producto'
        #swagger.description = 'Permite actualizar datos y/o cambiar la imagen del producto.'
        #swagger.consumes = ['multipart/form-data'] */
    productoController.update
);

router.delete('/:id', verificarToken,
    /*  #swagger.tags = ['Productos']
        #swagger.summary = 'Eliminar un producto' */
    productoController.destroy
);

export default router;
