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
import { error as sendError } from './utils/responseHelper.js';

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
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/roles', rolRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/proveedores', proveedorRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/facturas', facturaRoutes);
app.use('/api/carrito', carritoRoutes);
app.use('/api/admin/repartidores', repartidorRoutes);
app.use('/api/delivery/reparto', repartoRoutes);
// Backward-compatible aliases
app.use('/api/repartidores', repartidorRoutes);
app.use('/api/reparto', repartoRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bancos', bancosRoutes);
app.use('/api/uploads', uploadRoutes);

// ─── MANEJO DE ERRORES ───────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error no controlado:', err.stack);
  sendError(res, 'SERVER_ERROR', err.message, 500);
});

export default app;