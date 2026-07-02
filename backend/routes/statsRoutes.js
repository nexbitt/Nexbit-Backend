/**
 * @file statsRoutes.js
 * @description Endpoint público que devuelve estadísticas agregadas del sistema
 * en tiempo real: productos activos, pedidos totales, clientes registrados y categorías.
 */
import express from 'express';
import prisma from '../config/prisma.js';

const router = express.Router();

/**
 * GET /api/stats
 * Ruta pública (sin token). Devuelve conteos del sistema.
 */
router.get('/', async (req, res) => {
  // #swagger.tags = ['Estadísticas']
  // #swagger.summary = 'Estadísticas generales del sistema'
  // #swagger.description = 'Devuelve conteos de productos activos, pedidos, clientes y categorías. No requiere autenticación.'
  try {
    const [productos, pedidos, clientes, categorias] = await Promise.all([
      prisma.productos.count({ where: { activo: true } }),
      prisma.pedidos.count(),
      prisma.usuarios.count({
        where: { rol: { nombre: 'Cliente' } }
      }),
      prisma.categorias.count(),
    ]);

    res.json({
      productos:  Number(productos)  || 0,
      pedidos:    Number(pedidos)    || 0,
      clientes:   Number(clientes)   || 0,
      categorias: Number(categorias) || 0,
    });
  } catch (err) {
    console.error('Error en /api/stats:', err);
    res.status(500).json({ error: 'No se pudieron obtener las estadísticas.' });
  }
});

export default router;
