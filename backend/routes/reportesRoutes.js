/**
 * @file reportesRoutes.js
 * @description Rutas del módulo de reportes. Solo accesibles con token válido.
 */
import express from 'express';
const router = express.Router();
import { getVentas, getInventario, getSeguridad, getCarritos, getRepartidores } from '../controllers/reportesController.js';
import { verificarToken } from '../middleware/authMiddleware.js';

router.get('/ventas', verificarToken,
    /*  #swagger.tags = ['Reportes']
        #swagger.summary = 'Reporte de ventas' */
    getVentas
);

router.get('/inventario', verificarToken,
    /*  #swagger.tags = ['Reportes']
        #swagger.summary = 'Reporte de inventario' */
    getInventario
);

router.get('/seguridad', verificarToken,
    /*  #swagger.tags = ['Reportes']
        #swagger.summary = 'Reporte de seguridad' */
    getSeguridad
);

router.get('/carritos', verificarToken,
    /*  #swagger.tags = ['Reportes']
        #swagger.summary = 'Reporte de carritos activos' */
    getCarritos
);

router.get('/repartidores', verificarToken,
    /*  #swagger.tags = ['Reportes']
        #swagger.summary = 'Reporte de repartidores' */
    getRepartidores
);

export default router;
