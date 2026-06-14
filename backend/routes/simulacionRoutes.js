import express from 'express';
const router = express.Router();
import simulacionController from '../controllers/simulacionController.js';
import { verificarToken, verificarRol } from '../middleware/authMiddleware.js';
import { uploadComprobante } from '../middleware/uploadMiddleware.js';

router.use(verificarToken, verificarRol('Administrador'));

router.post('/checkout',
  /*  #swagger.tags = ['Simulación']
      #swagger.summary = 'Crear pedido en modo simulación (como cliente)' */
  simulacionController.checkout
);

router.post('/:id/comprobante', uploadComprobante.single('comprobante'),
  /*  #swagger.tags = ['Simulación']
      #swagger.summary = 'Subir comprobante de pago en modo simulación' */
  simulacionController.subirComprobante
);

router.put('/:id/estado',
  /*  #swagger.tags = ['Simulación']
      #swagger.summary = 'Actualizar estado de pedido en modo simulación (como repartidor)' */
  simulacionController.actualizarEstado
);

router.get('/pedidos/disponibles',
  /*  #swagger.tags = ['Simulación']
      #swagger.summary = 'Listar pedidos disponibles para simulación de repartidor' */
  simulacionController.listarDisponibles
);

export default router;
