# V2 — Cambios implementados en la rama `V2`

> **Fecha:** 2026-07-10
> **Ramas:** `V2` en Nexbit-Backend, Nexbit-Frontend, nexbit-mobile-intellij

---

## Resumen

Esta versión V2 incluye correcciones de seguridad, nuevas funcionalidades en el panel admin, y corrección de bugs críticos en el CRUD de usuarios.

---

## Archivos modificados

### Nexbit-Backend (backend)

| Archivo | Cambio | Commit |
|---------|--------|--------|
| `backend/routes/usuarioRoutes.js` | Protegidas rutas CRUD con `verificarRol('Administrador')` — GET /, GET /:id, POST /, DELETE /:id | `c6bc187` |
| `backend/routes/usuarioRoutes.js` | `POST /registro` se mantiene público (auto-registro) | `c6bc187` |
| `backend/routes/usuarioRoutes.js` | `PUT /:id` se mantiene con `verificarToken` (controller decide admin vs self) | `c6bc187` |
| `backend/routes/reportesRoutes.js` | Anotaciones Swagger agregadas a rutas KPI | `d4b92df` |
| `backend/controllers/usuarioController.js` | `updateSecure`: admin edita sin `current_password`; self-edit la requiere | `66c9660` |
| `backend/controllers/usuarioController.js` | `getOne`: eliminado `password` de la respuesta | `66c9660` |
| `backend/controllers/usuarioController.js` | `store`: captura error `P2002` (email duplicado) → 409 en vez de 500 | `66c9660` |
| `backend/controllers/usuarioController.js` | `update` (código muerto) eliminado | `66c9660` |
| `backend/controllers/usuarioController.js` | `getAll`: agregados `tipo_documento` y `telefono` al `select` de Prisma | `d4b92df` (fix) |
| `backend/controllers/productoController.js` | `getPublic`: agregado `proveedor_nombre` al response público | `d4b92df` (fix) |
| `backend/controllers/productoController.js` | Campos virtuales: `codigo_serie`, `iva_porcentaje`, `precio_sin_iva`, `precio_con_iva`, `ubicacion` | Cambio previo |
| `backend/controllers/productoController.js` | Validación nombre duplicado (HTTP 409) | Cambio previo |
| `backend/controllers/categoriaController.js` | Atributos dinámicos desde JSON en `descripcion` | Cambio previo |
| `backend/controllers/categoriaController.js` | Parseo de atributos JSON en `getAll`, `getOne`, `store`, `update` | Cambio previo |
| `backend/prisma/schema.prisma` | `productos.nombre` → UNIQUE | Cambio previo |
| `backend/prisma/schema.prisma` | `roles.rol_padre_id` agregado | Cambio previo |
| `backend/prisma/migrations/20260710000000_add_unique_productos_nombre/` | Migración: UNIQUE en productos.nombre | Cambio previo |
| `backend/prisma/migrations/20260710130443_add_unique_productos_nombre/` | Migración: UNIQUE en productos.nombre (v2) | Cambio previo |
| `db/schema.sql` | `productos.nombre` → UNIQUE; `roles.rol_padre_id` agregado | Cambio previo |
| `backend/swagger.json` | Regenerado con descripciones actualizadas de rutas | `43dbedd` |
| `reports/2026-07-10_fix-crud-usuarios-admin.md` | Reporte de plan ejecutado | — |

### Nexbit-Frontend

| Archivo | Cambio | Commit |
|---------|--------|--------|
| `src/pages/Perfil.jsx` | **FIX**: Cambiado `GET /api/v1/usuarios/:id` → `GET /api/v1/usuarios/me` para evitar 403 por `verificarRol` | `76838318` |
| `src/pages/Usuarios.jsx` | Manejo de error 409 en create/update; columnas nuevas en tabla | `2dac296b` |
| `src/components/ui/UsuarioFormModal.jsx` | Agregados campos `tipo_documento` (select CC/TI/CE/PASAPORTE) y `telefono` | `2dac296b` |
| `src/components/ui/CategoriaFormModal.jsx` | Editor de atributos dinámicos desde JSON | Cambio previo |
| `src/pages/Categorias.jsx` | Columna de atributos dinámicos | Cambio previo |
| `src/pages/Productos.jsx` | Columnas IVA, Ubicación, Código Serie; manejo error 409 | Cambio previo |
| `src/pages/Register.jsx` | Campos de emergencia (JSON en direccion) | Cambio previo |

### nexbit-mobile-intellij (Android)

| Archivo | Cambio | Commit |
|---------|--------|--------|
| `app/src/main/java/.../CatalogoActivity.kt` | Agregado `.error(R.drawable.ic_placeholder)` a Glide | `fc0bf0c` |
| `app/src/main/java/.../CatalogoFragment.kt` | Agregado `.error(R.drawable.ic_placeholder)` a Glide | `fc0bf0c` |
| `app/src/main/java/.../ClientMainActivity.kt` | Agregado `.error(R.drawable.ic_placeholder)` a Glide | `fc0bf0c` |
| `app/src/main/java/.../MainOrbixActivity.kt` | Agregado `.error(R.drawable.ic_placeholder)` a Glide | `fc0bf0c` |
| `app/src/main/java/.../ProductDetailActivity.kt` | Agregado `.error(R.drawable.ic_placeholder)` a Glide | `fc0bf0c` |

---

## Bugs conocidos (en investigación)

1. **Imágenes no aparecen**: `imagen_url = null` en productos existentes y/o Cloudinary no configurado. Verificar `.env` del backend.
2. **Logcat Android**: Advertencias de Glide (`Failed to find GeneratedAppGlideModule`) y `OnBackInvokedCallback` son normales en desarrollo y no afectan funcionalidad.

---

## Credenciales seed (V2)

```
Administrador: admin@remate.com / 123456
Cliente:       juan@email.com    / 123456
Repartidor:    luis@remate.com   / 123456
```

---

## Ramas V2

- `https://github.com/nexbitt/Nexbit-Backend/tree/V2`
- `https://github.com/nexbitt/Nexbit-Frontend/tree/V2`
- `https://github.com/nexbitt/nexbit-mobile-intellij/tree/V2`
