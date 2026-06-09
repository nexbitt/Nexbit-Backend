import express from 'express';
const router = express.Router();
import adminController from '../controllers/adminController.js';
import { verificarToken, verificarRol } from '../middleware/authMiddleware.js';

router.use(verificarToken, verificarRol('Administrador'));

router.get('/pedidos',
    adminController.listarPedidos
);

router.get('/pedidos/:id',
    adminController.obtenerPedido
);

router.patch('/pedidos/:id/gestion',
    adminController.gestionarPedido
);

export default router;
