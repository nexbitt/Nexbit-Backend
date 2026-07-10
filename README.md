# RematesPaisa — Backend

API REST del sistema de comercio electrónico RematesPaisa, construida con Node.js + Express 5 + Prisma ORM. Gestiona la lógica de negocio, autenticación JWT, conexión a base de datos MySQL y subida de imágenes con Cloudinary.

## Stack

| Categoría | Tecnología |
|-----------|-----------|
| Runtime | Node.js (v18+) |
| Framework | Express 5 |
| ORM | Prisma 5 (MySQL) |
| Autenticación | JWT (jsonwebtoken) |
| Archivos | Multer + Cloudinary |
| Tiempo real | Socket.IO 4 |
| Correos | Nodemailer |
| Documentación API | Swagger (swagger-jsdoc + swagger-ui-express) |
| Contraseñas | Bcrypt |

## Requisitos Previos

- **Node.js** v18 o superior
- **MySQL** v8 o superior
- **Git**

## Configuración de la Base de Datos

1. Crea una base de datos MySQL vacía (ej: `sistema_comercial`).

2. Importa la estructura:
   ```bash
   db/schema.sql
   ```

3. Importa los datos iniciales:
   ```bash
   db/seed.sql
   ```

4. (Opcional) Si existen archivos `migration_*.sql` en `db/`, ejecútalos en orden:
   ```bash
   db/migration_add_simulacion.sql
   db/migration_add_bancos.sql
   ```

> Los usuarios en `seed.sql` ya vienen con contraseñas encriptadas con Bcrypt.

## Instalación y Ejecución

1. Clona el repositorio:
   ```bash
   git clone https://github.com/equiposeis84/backend.git
   cd backend
   ```

2. Instala las dependencias:
   ```bash
   npm install --legacy-peer-deps
   ```

3. Crea el archivo `.env` en la raíz del proyecto (`backend/`) con las siguientes variables:
   ```env
   PORT=3000
   JWT_SECRET=mi_clave_secreta_super_segura_2024_remates
   CORS_ORIGIN=http://localhost:5173
   DATABASE_URL="mysql://root:@localhost:3306/sistema_comercial"
   CLOUDINARY_CLOUD_NAME=tu_cloud_name
   CLOUDINARY_API_KEY=tu_api_key
   CLOUDINARY_API_SECRET=tu_api_secret
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=correo@gmail.com
   SMTP_PASS=contraseña_de_aplicacion
   SMTP_FROM=correo@gmail.com
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=sistema_comercial
   ```

4. Inicia el servidor:
   ```bash
   npm run dev
   ```
   > El backend corre por defecto en `http://localhost:3000`

## Scripts Disponibles

| Comando | Descripción |
|---------|------------|
| `npm run dev` | Inicia con nodemon (recarga automática) |
| `npm start` | Inicia en producción |
| `npm run swagger` | Genera documentación Swagger |
| `npm run db:migrate` | Ejecuta migraciones de Prisma (dev) |
| `npm run db:deploy` | Ejecuta migraciones de Prisma (prod) |

## Credenciales de Prueba

Contraseña para todos los usuarios: **`admin123`**

| Rol | Correo |
|-----|--------|
| Administrador | admin@remate.com |
| Cliente | cliente@ejemplo.com |
| Repartidor 1 | repartidor1@ejemplo.com |
| Repartidor 2 | repartidor2@ejemplo.com |

## Documentación API

Con el servidor corriendo, la documentación Swagger está disponible en:
```
http://localhost:3000/api-docs
```

## Repositorios Relacionados

- [Frontend](https://github.com/equiposeis84/frontend)
- [Mobile](https://github.com/equiposeis84/mobile)
