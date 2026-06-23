import express from 'express';
const router = express.Router();
import bancosController from '../controllers/bancosController.js';
import { verificarToken } from '../middleware/authMiddleware.js';

router.get('/', verificarToken,
    /*  #swagger.tags = ['Bancos']
        #swagger.summary = 'Listar bancos y métodos de pago disponibles' */
    bancosController.listar
);

export default router;
