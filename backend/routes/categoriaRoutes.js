import express from 'express';
const router = express.Router();
import categoriaController from '../controllers/categoriaController.js';
import { verificarToken } from '../middleware/authMiddleware.js';

router.get('/', verificarToken,
    /*  #swagger.tags = ['Categorías']
        #swagger.summary = 'Listar todas las categorías' */
    categoriaController.getAll
);

router.get('/:id', verificarToken,
    /*  #swagger.tags = ['Categorías']
        #swagger.summary = 'Obtener una categoría por ID' */
    categoriaController.getOne
);

router.post('/', verificarToken,
    /*  #swagger.tags = ['Categorías']
        #swagger.summary = 'Crear una nueva categoría' */
    categoriaController.store
);

router.put('/:id', verificarToken,
    /*  #swagger.tags = ['Categorías']
        #swagger.summary = 'Actualizar una categoría' */
    categoriaController.update
);

router.delete('/:id', verificarToken,
    /*  #swagger.tags = ['Categorías']
        #swagger.summary = 'Eliminar una categoría' */
    categoriaController.destroy
);

export default router;