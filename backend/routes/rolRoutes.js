import express from 'express';
const router = express.Router();
import rolController from '../controllers/rolController.js';
import { verificarToken } from '../middleware/authMiddleware.js';

router.get('/', verificarToken,
    /*  #swagger.tags = ['Roles']
        #swagger.summary = 'Listar todos los roles' */
    rolController.getAll
);

router.get('/:id', verificarToken,
    /*  #swagger.tags = ['Roles']
        #swagger.summary = 'Obtener un rol por ID' */
    rolController.getOne
);

router.post('/', verificarToken,
    /*  #swagger.tags = ['Roles']
        #swagger.summary = 'Crear un nuevo rol' */
    rolController.store
);

router.put('/:id', verificarToken,
    /*  #swagger.tags = ['Roles']
        #swagger.summary = 'Actualizar un rol' */
    rolController.update
);

router.delete('/:id', verificarToken,
    /*  #swagger.tags = ['Roles']
        #swagger.summary = 'Eliminar un rol' */
    rolController.destroy
);

export default router;