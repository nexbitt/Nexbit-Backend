# PROJECT.md — Nexbit-Backend
> Generado por el agente de planificación técnica.
> Creado: 2026-07-02 | Motivo: Documentación inicial del proyecto

## Origen
- **Tipo:** Heredado
- **Repositorio original:** `https://github.com/equiposeis84/backend.git`
- **Archivos usados para inferencia:** `package.json`, `docker-compose.yml`, `app.js`, `server.js`, `prisma/schema.prisma`, `README.md`, directorios `routes/`, `controllers/`, `middleware/`, `db/`

## Stack
- **Runtime:** Node.js (v18+)
- **Framework:** Express 5.2.1 (ES Modules)
- **ORM:** Prisma 5.22 (con Prisma Client JS)
- **Base de datos:** MySQL 8.0 (MariaDB 10.4.32 en local)
- **Autenticación:** JWT (`jsonwebtoken` 9.x)
- **Tiempo real:** Socket.IO 4.8.3
- **Imágenes:** Cloudinary + Multer-Storage-Cloudinary
- **Correo:** Nodemailer 8.x (OTP para recuperación de contraseña)
- **Documentación API:** Swagger (swagger-jsdoc + swagger-ui-express)
- **Gestor de paquetes:** npm
- **Monitorización:** Nodemon (dev)

## Arquitectura
- **Tipo:** Monolito con microservicio incipiente (definido en docker-compose pero no implementado)
- **Patrón:** MVC tradicional con capas:
  - `routes/` → definición de endpoints
  - `controllers/` → lógica de negocio
  - `middleware/` → autenticación y subida de archivos
  - `config/` → configuración de Prisma
  - `utils/` → utilidades (email)
- **API:** RESTful con prefijo `/api/v1/`
- **Formato de respuesta:** JSON

## Mapa de responsabilidades
| Directorio | Propósito |
|-----------|-----------|
| `/backend/routes/` | 17 archivos de rutas (auth, usuarios, roles, categorías, productos, pedidos, facturas, carrito, repartidores, stats, reportes, reparto, chat, admin, bancos, uploads) |
| `/backend/controllers/` | 15 controladores con lógica de negocio |
| `/backend/middleware/` | `authMiddleware.js` (JWT + roles), `uploadMiddleware.js` (Cloudinary) |
| `/backend/prisma/` | Schema, migraciones, seed |
| `/backend/config/` | Cliente Prisma singleton |
| `/backend/utils/` | Envío de emails (OTP) |
| `/backend/templates/` | Plantilla de email OTP |
| `/db/` | SQL base (schema.sql, seed.sql, migraciones manuales) |

## Modelo de datos (16 tablas)
1. **roles** — Catálogo de roles (Administrador, Cliente, Repartidor)
2. **usuarios** — Usuarios del sistema (con rol, documento, dirección, activo)
3. **categorias** — Categorías de productos
4. **proveedores** — Proveedores de productos
5. **productos** — Productos (con precio compra/venta, stock, imagen)
6. **pedidos** — Pedidos con flujo de 10 estados (PENDIENTE → ... → ENTREGADO/CANCELADO)
7. **detalle_pedido** — Líneas de cada pedido
8. **facturas** — Facturación de pedidos (EMITIDA/PAGADA/ANULADA)
9. **carrito** — Carrito de compras (por usuario o sesión)
10. **movimientos_inventario** — Control de stock (ENTRADA/SALIDA/AJUSTE/VENTA/COMPRA)
11. **seguimiento_pedido** — Auditoría de cambios de estado
12. **conversaciones** — Chat por pedido (usuario ↔ admin)
13. **mensajes** — Mensajes del chat
14. **password_resets** — OTP para recuperación de contraseña
15. **notificaciones** — Notificaciones push
16. **configuracion_bancaria** — Datos bancarios para transferencias

## Estados del pedido (enum)
PENDIENTE → CONFIRMADO → EN_REVISION → APROBADO/RECHAZADO → ASIGNADO → EN_CAMINO → ENTREGADO | CANCELADO | DISPONIBLE

## Convenciones detectadas
- ES Modules (`"type": "module"` en package.json)
- Nomenclatura de archivos: camelCase (ej. `authRoutes.js`, `authController.js`)
- Prefijo de rutas: `/api/v1/`
- Manejo de errores: middleware global Express 5
- ORM: Prisma con modelo `snake_case` en BD y `camelCase` en JS
- Seed de BD: `prisma/seed.js` con configuración en `package.json`

## Restricciones
- El backend requiere MySQL 8+ corriendo en localhost:3306
- Las variables de entorno están en `backend/.env` (incluido en `.gitignore` pero existe localmente)
- CORS configurado para localhost:5173, :3000, :8081
- Docker Compose existe pero el microservicio `ms-productos-categorias` no está implementado (no existe `/microservices/`)
- No hay tests automatizados configurados

## Estado actual
- **Funcional:** Autenticación, CRUD completo de todas las entidades, carrito, pedidos, facturación, chat, upload de imágenes, recuperación de contraseña
- **En desarrollo:** Simulación de flujo de pedidos
- **No implementado:** Microservicio de productos-categorías (definido en docker-compose pero sin código)

## Decisiones clave
- Se eligió Express 5 sobre NestJS por simplicidad y rapidez de desarrollo
- Prisma sobre Sequelize/TypeORM por su schema declarativo y migraciones
- MySQL sobre PostgreSQL por compatibilidad con el entorno del equipo
- Socket.IO para tiempo real en lugar de polling o Server-Sent Events
- Swagger para documentación automática de la API
