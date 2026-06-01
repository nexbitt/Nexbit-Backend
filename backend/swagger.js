/**
 * @file swagger.js
 * @description Script para auto-generar la documentación Swagger (swagger.json).
 * Ejecutar con: node swagger.js  ó  npm run swagger
 */
import swaggerAutogen from 'swagger-autogen';

const outputFile = './swagger.json';
const endpointsFiles = ['./app.js'];

const doc = {
    info: {
        title: 'Nexbit API',
        description: 'Documentación completa de la API del sistema comercial Nexbit. Los endpoints están organizados por módulo.',
        version: '1.0.0'
    },
    host: 'localhost:3000',
    basePath: '/',
    schemes: ['http'],
    tags: [
        { name: 'Autenticación',  description: 'Login, logout y registro de usuarios' },
        { name: 'Usuarios',       description: 'Gestión de usuarios del sistema (CRUD)' },
        { name: 'Roles',          description: 'Gestión de roles del sistema' },
        { name: 'Categorías',     description: 'Gestión de categorías de productos' },
        { name: 'Proveedores',    description: 'Gestión de proveedores' },
        { name: 'Productos',      description: 'Gestión de productos e inventario (incluye subida de imágenes a Cloudinary)' },
        { name: 'Carrito',        description: 'Operaciones del carrito de compras del cliente' },
        { name: 'Pedidos',        description: 'Gestión de pedidos (creación, checkout, cancelación)' },
        { name: 'Facturas',       description: 'Gestión de facturas asociadas a pedidos' },
        { name: 'Repartidores',   description: 'Administración de repartidores y asignación de pedidos' },
        { name: 'Reparto',        description: 'Panel del repartidor: aceptar y entregar pedidos' },
        { name: 'Reportes',       description: 'Generación de reportes (ventas, inventario, seguridad, carritos, repartidores)' },
        { name: 'Estadísticas',   description: 'Estadísticas públicas del sistema en tiempo real' },
    ],
    securityDefinitions: {
        Bearer: {
            type: 'apiKey',
            name: 'Authorization',
            in: 'header',
            description: 'Ingresa tu token JWT con el prefijo Bearer. Ejemplo: "Bearer eyJhbGciOi..."'
        }
    }
};

swaggerAutogen()(outputFile, endpointsFiles, doc).then(() => {
    console.log("¡Éxito! Documentación generada en swagger.json");
    console.log("Ver en: http://localhost:3000/doc");
});
