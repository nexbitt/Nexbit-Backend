import express from 'express';
const router = express.Router();
import bancosController from '../controllers/bancosController.js';
import { verificarToken } from '../middleware/authMiddleware.js';

router.get('/', verificarToken,
    bancosController.listar
);

export default router;
