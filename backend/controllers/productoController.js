/**
 * @file productoController.js
 * @description Controlador para las operaciones CRUD de productos.
 * Incluye la lógica de integración con Cloudinary para imágenes.
 */
import Producto from '../models/productoModel.js';
import { v2 as cloudinary } from 'cloudinary';
import jwt from 'jsonwebtoken';
import { success, error as responseError, notFound, badRequest, unauthorized, forbidden, conflict } from '../utils/responseHelper.js';

const SECRET_KEY = process.env.JWT_SECRET || 'mi_clave_secreta_super_segura';

const getAll = async (req, res) => {
    try {
        const data = await Producto.findAll();
        success(res, data);
    } catch (error) {
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

// ── Catálogo público: solo activos, sin token ──────────────────────
const getPublic = async (req, res) => {
    try {
        const data = await Producto.findAllActive();
        const safeData = data.map(({ id_producto, nombre, precio_venta, categoria_nombre, imagen_url, descripcion, stock_actual }) => ({
            id_producto,
            nombre,
            precio_venta,
            categoria_nombre,
            imagen_url,
            descripcion,
            stock_actual
        }));
        success(res, safeData);
    } catch (error) {
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

const getOne = async (req, res) => {
    try {
        const row = await Producto.findById(req.params.id);
        if (!row) return notFound(res, 'Producto');

        // Verificar si quien consulta tiene privilegios de Administrador
        let isAdmin = false;
        let token = null;

        // 1. Intentar leer desde la cookie httpOnly
        if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        // 2. Intentar leer desde el header Authorization
        if (!token) {
            const authHeader = req.headers['authorization'];
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.split(' ')[1];
            }
        }

        if (token) {
            try {
                const decoded = jwt.verify(token, SECRET_KEY);
                // rol_id = 1 es Administrador
                if (decoded && decoded.rol_id === 1) {
                    isAdmin = true;
                }
            } catch (_) {
                // Token inválido o expirado, tratar como invitado
            }
        }

        if (isAdmin) {
            success(res, row);
        } else {
            const { precio_compra, stock_minimo, ...safeRow } = row;
            success(res, safeRow);
        }
    } catch (error) {
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

const store = async (req, res) => {
    try {
        const { nombre } = req.body;
        const sanitizedNombre = nombre?.trim();
        if (!sanitizedNombre || sanitizedNombre.length < 3) {
            return badRequest(res, 'El nombre debe tener al menos 3 caracteres');
        }

        const { categoria_id, precio_compra, precio_venta } = req.body;
        if (!categoria_id || precio_compra === undefined || precio_venta === undefined) {
            return badRequest(res, 'La categoría y precios son obligatorios');
        }

        // req.file.path contiene la URL pública de Cloudinary
        const imagen_url = req.file ? (req.file.path || req.file.secure_url || req.file.url) : null;

        const id = await Producto.create({ ...req.body, nombre: sanitizedNombre, imagen_url });
        success(res, { id_producto: id }, 'Producto creado con éxito', 201);
    } catch (error) {
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

const update = async (req, res) => {
    try {
        const { id } = req.params;

        let imagen_url = req.body.imagen_url; // URL anterior si no cambió
        if (req.file) {
            imagen_url = req.file.path || req.file.secure_url || req.file.url; // Nueva imagen subida a Cloudinary

            // Borrar la imagen anterior de Cloudinary para no acumular archivos
            const productoActual = await Producto.findById(id);
            if (productoActual?.imagen_url) {
                try {
                    const urlParts = productoActual.imagen_url.split('/');
                    // Extract rematespaisa/productos/filename without extension
                    const folderAndFile = urlParts.slice(-3).join('/');
                    const publicId = folderAndFile.substring(0, folderAndFile.lastIndexOf('.'));
                    await cloudinary.uploader.destroy(publicId);
                } catch (_) {
                    // No interrumpir el flujo si falla la limpieza
                }
            }
        }

        const updateData = { ...req.body, imagen_url };
        if (updateData.nombre) {
            updateData.nombre = updateData.nombre.trim();
            if (updateData.nombre.length < 3) return badRequest(res, 'El nombre debe tener al menos 3 caracteres');
        }
        const actualizado = await Producto.update(id, updateData);
        if (!actualizado) return notFound(res, 'Producto');
        success(res, null, 'Producto actualizado correctamente');
    } catch (error) {
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

const destroy = async (req, res) => {
    try {
        const { id } = req.params;

        // Borrar imagen de Cloudinary antes de eliminar el producto
        const producto = await Producto.findById(id);
        if (producto?.imagen_url) {
            try {
                const urlParts = producto.imagen_url.split('/');
                const folderAndFile = urlParts.slice(-3).join('/');
                const publicId = folderAndFile.substring(0, folderAndFile.lastIndexOf('.'));
                await cloudinary.uploader.destroy(publicId);
            } catch (_) {
                // No interrumpir el flujo si falla la limpieza
            }
        }

        const eliminado = await Producto.delete(id);
        if (!eliminado) return notFound(res, 'Producto');
        success(res, null, 'Producto eliminado');
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return badRequest(res, 'No se puede eliminar este producto porque se usa en inventarios o pedidos.');
        }
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

export default { getAll, getPublic, getOne, store, update, destroy };
