# RematesPaisa — Backend

API REST del sistema de comercio electrónico RematesPaisa, construida con Node.js + Express + Prisma ORM. Gestiona la lógica de negocio, autenticación JWT, conexión a base de datos MySQL y subida de imágenes con Cloudinary.

## Requisitos Previos

- **Node.js** (v18 o superior)
- **MySQL** (v8 o superior)
- **Git**

---

## 1. Configuración de la Base de Datos

1. Abre tu gestor de base de datos MySQL (phpMyAdmin, MySQL Workbench o DBeaver).
2. Crea una base de datos vacía llamada `remates_db`.
3. Importa la estructura ejecutando:
```bash
   db/schema.sql
```
4. Importa los datos iniciales ejecutando:
```bash
   db/seed.sql
```

> Los usuarios en `seed.sql` ya vienen con contraseñas encriptadas con Bcrypt.

---

## 2. Instalación y Ejecución

1. Clona el repositorio:
```bash
   git clone https://github.com/equiposeis84/backend.git
   cd backend
```

2. Instala las dependencias:
```bash
   npm install --legacy-peer-deps
```

3. Configura las variables de entorno. Duplica `.env.example` y renómbralo `.env`, luego actualiza:
   - `DATABASE_URL` — tu conexión a MySQL
   - `JWT_SECRET` — clave secreta para tokens
   - Credenciales de **Cloudinary**

4. Inicia el servidor:
```bash
   npm run dev
```

> El backend corre por defecto en `http://localhost:3000`

---

## Credenciales de Prueba

Contraseña para todos los usuarios: **`admin123`**

| Rol | Correo |
|-----|--------|
| Administrador | admin@remate.com |
| Cliente | cliente@ejemplo.com |
| Repartidor 1 | repartidor1@ejemplo.com |
| Repartidor 2 | repartidor2@ejemplo.com |

---

## 🔗 Repositorios relacionados

- [Frontend](https://github.com/equiposeis84/frontend)
- [Mobile](https://github.com/equiposeis84/mobile)