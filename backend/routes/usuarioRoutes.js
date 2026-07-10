import express from 'express';
const router = express.Router();
import usuarioController from '../controllers/usuarioController.js';
import { verificarToken, verificarRol } from '../middleware/authMiddleware.js';

// ─── Rutas PÚBLICAS (no requieren token) ─────────────────────────────────────
router.post('/login',
    /*  #swagger.tags = ['Autenticación']
        #swagger.summary = 'Iniciar sesión'
        #swagger.description = 'Autentica al usuario y devuelve un token JWT.' */
    usuarioController.login
);

router.post('/logout',
    /*  #swagger.tags = ['Autenticación']
        #swagger.summary = 'Cerrar sesión'
        #swagger.description = 'Limpia la cookie httpOnly del token.' */
    usuarioController.logout
);

router.post('/registro',
    /*  #swagger.tags = ['Autenticación']
        #swagger.summary = 'Registro público'
        #swagger.description = 'Permite que un nuevo usuario se auto-registre como Cliente.' */
    usuarioController.store
);

router.get('/roles',
    /*  #swagger.tags = ['Roles']
        #swagger.summary = 'Listar roles (público)' */
    usuarioController.getRoles
);

router.get('/tipos-documento',
    /*  #swagger.tags = ['Usuarios']
        #swagger.summary = 'Listar tipos de documento permitidos' */
    usuarioController.getTiposDocumento
);

router.get('/me', verificarToken,
    /*  #swagger.tags = ['Usuarios']
        #swagger.summary = 'Obtener perfil del usuario autenticado' */
    usuarioController.getMe
);

// ─── Rutas PROTEGIDAS (requieren JWT válido) ──────────────────────────────────
router.get('/', verificarToken, verificarRol('Administrador'),
    /*  #swagger.tags = ['Usuarios']
        #swagger.summary = 'Listar todos los usuarios (solo Admin)' */
    usuarioController.getAll
);

router.get('/:id', verificarToken, verificarRol('Administrador'),
    /*  #swagger.tags = ['Usuarios']
        #swagger.summary = 'Obtener un usuario por ID (solo Admin)' */
    usuarioController.getOne
);

router.post('/', verificarToken, verificarRol('Administrador'),
    /*  #swagger.tags = ['Usuarios']
        #swagger.summary = 'Crear un nuevo usuario (solo Admin)' */
    usuarioController.store
);

router.post('/verificar-contrasena', verificarToken,
    /*  #swagger.tags = ['Usuarios']
        #swagger.summary = 'Verificar contraseña actual del usuario autenticado' */
    usuarioController.verificarContrasena
);

router.put('/:id', verificarToken,
    /*  #swagger.tags = ['Usuarios']
        #swagger.summary = 'Actualizar un usuario (requiere current_password)' */
    usuarioController.update
);

router.delete('/:id', verificarToken, verificarRol('Administrador'),
    /*  #swagger.tags = ['Usuarios']
        #swagger.summary = 'Eliminar un usuario (solo Admin)' */
    usuarioController.destroy
);

export default router;