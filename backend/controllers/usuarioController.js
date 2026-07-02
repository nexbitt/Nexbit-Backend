import prisma from '../config/prisma.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const SECRET_KEY = process.env.JWT_SECRET || 'mi_clave_secreta_super_segura';

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
};

function generarToken(payload) {
    return jwt.sign(payload, SECRET_KEY, { expiresIn: '24h' });
}

function normalizeActivo(valor) {
    if (typeof valor === 'boolean') return valor;
    if (valor === 1 || valor === '1' || valor === 'true') return true;
    if (valor === 0 || valor === '0' || valor === 'false') return false;
    return Boolean(valor);
}

const getAll = async (req, res) => {
    try {
        const rows = await prisma.usuarios.findMany({
            orderBy: { id_usuario: 'asc' },
            select: {
                id_usuario: true,
                rol_id: true,
                nombre: true,
                email: true,
                numero_documento: true,
                activo: true,
                rol: { select: { nombre: true } }
            }
        });
        const data = rows.map(u => ({ ...u, rol_nombre: u.rol?.nombre, rol: undefined }));
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getOne = async (req, res) => {
    try {
        const u = await prisma.usuarios.findUnique({
            where: { id_usuario: Number(req.params.id) },
            include: { rol: true }
        });
        if (!u) return res.status(404).json({ message: 'Usuario no encontrado' });
        res.json({ ...u, rol_nombre: u.rol?.nombre });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const store = async (req, res) => {
    try {
        const { rol_id, nombre, email, password, tipo_documento, numero_documento, telefono, direccion } = req.body;
        if (!rol_id || !nombre || !email || !password) {
            return res.status(400).json({ message: 'Faltan campos obligatorios' });
        }

        const roleObj = await prisma.roles.findUnique({ where: { id_rol: Number(rol_id) } });
        if (!roleObj) {
            return res.status(400).json({ message: 'El rol especificado no existe.' });
        }

        const isRolAdministrativo = roleObj.nombre.toLowerCase().includes('admin') ||
                                    roleObj.nombre.toLowerCase().includes('administrador');

        if (isRolAdministrativo) {
            let token = null;

            if (req.cookies && req.cookies.token) {
                token = req.cookies.token;
            }

            if (!token) {
                const authHeader = req.headers['authorization'];
                if (authHeader && authHeader.startsWith('Bearer ')) {
                    token = authHeader.split(' ')[1];
                }
            }

            if (!token) {
                return res.status(401).json({ message: 'Acceso denegado. No se proporcionó un token de administrador para crear un usuario administrativo.' });
            }

            try {
                const decoded = jwt.verify(token, SECRET_KEY);
                const creador = await prisma.usuarios.findUnique({
                    where: { id_usuario: decoded.userId },
                    include: { rol: true }
                });
                if (!creador || !creador.rol?.nombre || !creador.rol.nombre.toLowerCase().includes('admin')) {
                    return res.status(403).json({ message: 'Acceso denegado. Solo un administrador puede crear usuarios con privilegios administrativos.' });
                }
            } catch (jwtError) {
                if (jwtError.name === 'TokenExpiredError') {
                    return res.status(401).json({ message: 'Token de administrador expirado. Por favor, inicia sesión de nuevo.' });
                }
                return res.status(403).json({ message: 'Token de administrador inválido.' });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await prisma.usuarios.create({
            data: {
                rol_id: Number(rol_id),
                nombre,
                email,
                password: hashedPassword,
                tipo_documento,
                numero_documento,
                telefono,
                direccion,
                activo: true
            }
        });
        res.status(201).json({ message: 'Usuario creado con éxito', id_usuario: result.id_usuario });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const update = async (req, res) => {
    try {
        const { id } = req.params;
        const actualizado = await prisma.usuarios.updateMany({
            where: { id_usuario: Number(id) },
            data: req.body
        });
        if (!actualizado.count) return res.status(404).json({ message: 'No se encontró el registro para actualizar' });
        res.json({ message: 'Usuario actualizado correctamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getRoles = async (req, res) => {
    try {
        const roles = await prisma.roles.findMany();
        res.json(roles);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const destroy = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await prisma.usuarios.deleteMany({ where: { id_usuario: Number(id) } });
        if (!result.count) return res.status(404).json({ message: 'Usuario no encontrado' });
        res.json({ message: 'Usuario eliminado físicamente' });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ error: 'No se puede eliminar este usuario porque ya tiene registros asociados.' });
        }
        res.status(500).json({ message: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const u = await prisma.usuarios.findUnique({
            where: { email },
            include: { rol: true }
        });
        const user = u ? { ...u, rol_nombre: u.rol?.nombre } : null;

        const passwordValida = user && await bcrypt.compare(password, user.password);
        if (!passwordValida) {
            return res.status(401).json({ message: 'Correo o contraseña incorrectos' });
        }
        if (!user.activo) {
            return res.status(403).json({ message: 'La cuenta está inactiva.' });
        }

        delete user.password;

        const payload = { userId: user.id_usuario, user: user.nombre, rol_id: user.rol_id };
        const token = generarToken(payload);

        res.cookie('token', token, cookieOptions);

        res.json({
            message: '¡Inicio de sesión exitoso!',
            user,
            token
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getMe = async (req, res) => {
    try {
        const u = await prisma.usuarios.findUnique({
            where: { id_usuario: req.usuario.userId },
            include: { rol: true }
        });
        if (!u) return res.status(404).json({ message: 'Usuario no encontrado' });
        const user = { ...u, rol_nombre: u.rol?.nombre };
        delete user.password;
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const logout = (req, res) => {
    res.clearCookie('token', { httpOnly: true, sameSite: 'lax' });
    res.json({ message: 'Sesión cerrada correctamente' });
};

const verificarContrasena = async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ message: 'La contraseña es requerida' });
        }

        const u = await prisma.usuarios.findUnique({
            where: { id_usuario: req.usuario.userId },
            include: { rol: true }
        });
        const user = u ? { ...u, rol_nombre: u.rol?.nombre } : null;
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const valida = await bcrypt.compare(password, user.password);
        if (!valida) {
            return res.status(401).json({ message: 'Contraseña incorrecta', valida: false });
        }

        res.json({ message: 'Identidad confirmada', valida: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateSecure = async (req, res) => {
    try {
        const { id } = req.params;
        const { current_password, ...data } = req.body;

        if (Number(id) !== req.usuario.userId) {
            return res.status(403).json({ message: 'No puedes modificar los datos de otro usuario' });
        }

        if (!current_password) {
            return res.status(400).json({ message: 'Debes proporcionar tu contraseña actual para guardar los cambios' });
        }

        const u = await prisma.usuarios.findUnique({
            where: { id_usuario: Number(id) },
            include: { rol: true }
        });
        const user = u ? { ...u, rol_nombre: u.rol?.nombre } : null;
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const valida = await bcrypt.compare(current_password, user.password);
        if (!valida) {
            return res.status(401).json({ message: 'Contraseña actual incorrecta. No se guardaron los cambios.' });
        }

        const updateData = {};
        if (data.rol_id !== undefined) updateData.rol_id = Number(data.rol_id);
        if (data.nombre !== undefined) updateData.nombre = data.nombre;
        if (data.email !== undefined) updateData.email = data.email;
        if (data.password) {
            updateData.password = await bcrypt.hash(data.password, 10);
        }
        if (data.tipo_documento !== undefined) updateData.tipo_documento = data.tipo_documento;
        if (data.numero_documento !== undefined) updateData.numero_documento = data.numero_documento;
        if (data.telefono !== undefined) updateData.telefono = data.telefono;
        if (data.direccion !== undefined) updateData.direccion = data.direccion;
        if (data.activo !== undefined) {
            updateData.activo = normalizeActivo(data.activo);
        }

        const result = await prisma.usuarios.updateMany({
            where: { id_usuario: Number(id) },
            data: updateData
        });
        if (!result.count) return res.status(404).json({ message: 'No se encontró el registro para actualizar' });

        res.json({ message: 'Usuario actualizado correctamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export default { getAll, getOne, store, update: updateSecure, getRoles, destroy, login, logout, getMe, verificarContrasena };