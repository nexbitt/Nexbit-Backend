/**
 * @file app.js
 * @description Configuración principal de la aplicación Express.
 * Incluye middlewares, rutas, manejo de errores y documentación Swagger.
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUI from 'swagger-ui-express';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const swaggerDocumentation = require('./swagger.json');

import authRoutes from './routes/authRoutes.js';
import usuarioRoutes from './routes/usuarioRoutes.js';
import rolRoutes from './routes/rolRoutes.js';
import categoriaRoutes from './routes/categoriaRoutes.js';
import proveedorRoutes from './routes/proveedorRoutes.js';
import productoRoutes from './routes/productoRoutes.js';
import pedidoRoutes from './routes/pedidoRoutes.js';
import facturaRoutes from './routes/facturaRoutes.js';
import carritoRoutes from './routes/carritoRoutes.js';
import repartidorRoutes from './routes/repartidorRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import reportesRoutes from './routes/reportesRoutes.js';
import repartoRoutes from './routes/repartoRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import bancosRoutes from './routes/bancosRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';

const app = express();

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:8081', // Expo/React Native default
  'http://127.0.0.1:8081'
];

// Si existe en el .env, lo añadimos
if (process.env.CORS_ORIGIN) {
  process.env.CORS_ORIGIN.split(',').forEach(origin => {
    if (!allowedOrigins.includes(origin)) allowedOrigins.push(origin);
  });
}

const corsOptions = {
  origin: (origin, callback) => {
    // Permitir peticiones sin origen (Postman, curl, Swagger Try-it-out interno)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS bloqueado para el origen: ${origin}`);
      // Error explícito → el servidor devuelve 403 con mensaje claro
      callback(new Error(`Origen no permitido por CORS: ${origin}`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 200 // Compatibilidad con navegadores antiguos (IE11)
};

app.use(cors(corsOptions));

// Responde explícitamente a preflight OPTIONS en todas las rutas (sintaxis Express 5)
app.options('/{*path}', cors(corsOptions));

// ─── PARSERS ─────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(cookieParser()); // Lee cookies del request

// ─── SWAGGER ─────────────────────────────────────────────────────────────────
app.use('/doc', swaggerUI.serve, swaggerUI.setup(swaggerDocumentation));

// ─── RUTAS ───────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/usuarios', usuarioRoutes);
app.use('/api/v1/roles', rolRoutes);
app.use('/api/v1/categorias', categoriaRoutes);
app.use('/api/v1/proveedores', proveedorRoutes);
app.use('/api/v1/productos', productoRoutes);
app.use('/api/v1/pedidos', pedidoRoutes);
app.use('/api/v1/facturas', facturaRoutes);
app.use('/api/v1/carrito', carritoRoutes);
app.use('/api/v1/repartidores', repartidorRoutes);
app.use('/api/v1/stats', statsRoutes);
app.use('/api/v1/reportes', reportesRoutes);
app.use('/api/v1/reparto', repartoRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/bancos', bancosRoutes);
app.use('/api/v1/uploads', uploadRoutes);

// ─── MANEJO DE ERRORES ───────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error no controlado:', err.stack);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: err.message
  });
});

export default app;