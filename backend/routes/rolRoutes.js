import express from 'express';
const router = express.Router();
import rolController from '../controllers/rolController.js';
import { verificarToken, verificarRol } from '../middleware/authMiddleware.js';

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

router.post('/', verificarToken, verificarRol('Administrador'),
    /*  #swagger.tags = ['Roles']
        #swagger.summary = 'Crear un nuevo rol (solo Administrador)' */
    rolController.store
);

router.put('/:id', verificarToken, verificarRol('Administrador'),
    /*  #swagger.tags = ['Roles']
        #swagger.summary = 'Actualizar un rol (solo Administrador)' */
    rolController.update
);

export default router;