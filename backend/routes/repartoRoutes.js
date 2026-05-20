import express from 'express';
const router = express.Router();
import repartoController from '../controllers/repartoController.js';
import { verificarToken } from '../middleware/authMiddleware.js';

// Rutas de reparto - Panel del Repartidor
router.get('/pedidos', verificarToken, repartoController.obtenerPedidos);
router.post('/pedidos/:id_pedido/aceptar', verificarToken, repartoController.aceptarPedido);
router.post('/pedidos/:id_pedido/entregar', verificarToken, repartoController.entregarPedido);

export default router;
