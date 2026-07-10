import prisma from '../config/prisma.js';
import { v2 as cloudinary } from 'cloudinary';
import jwt from 'jsonwebtoken';
import { uploadToCloudinary } from '../middleware/uploadMiddleware.js';

const SECRET_KEY = process.env.JWT_SECRET || 'mi_clave_secreta_super_segura';

const includeRelations = {
    categoria: { select: { nombre: true } },
    proveedor:  { select: { nombre: true } }
};

const IVA_PORCENTAJE = 0.19; // 19% IVA Colombia

// Extraer ubicación desde la descripción si está en formato JSON
const extraerUbicacion = (descripcion) => {
    try {
        const parsed = JSON.parse(descripcion);
        return parsed.ubicacion || null;
    } catch { return null; }
};

const mapProducto = (p) => {
    const precioVenta = Number(p.precio_venta);
    return {
        ...p,
        activo: p.activo ? 1 : 0,
        categoria_nombre: p.categoria?.nombre,
        proveedor_nombre: p.proveedor?.nombre,
        categoria: undefined,
        proveedor: undefined,
        // Campos virtuales para sustentación
        codigo_serie: `PRD-${String(p.id_producto).padStart(5, '0')}-${p.categoria_id || '0'}`,
        iva_porcentaje: Math.round(IVA_PORCENTAJE * 100) + '%',
        precio_sin_iva: precioVenta,
        precio_con_iva: Math.round(precioVenta * (1 + IVA_PORCENTAJE) * 100) / 100,
        ubicacion: extraerUbicacion(p.descripcion)
    };
};

const getAll = async (req, res) => {
    try {
        const rows = await prisma.productos.findMany({
            orderBy: { id_producto: 'asc' },
            include: includeRelations
        });
        const data = rows.map(mapProducto);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getPublic = async (req, res) => {
    try {
        const rows = await prisma.productos.findMany({
            where: { activo: true },
            orderBy: { id_producto: 'asc' },
            include: includeRelations
        });
        const data = rows.map(mapProducto);
        const safeData = data.map(({ id_producto, nombre, precio_venta, categoria_nombre, imagen_url, descripcion, stock_actual, codigo_serie, iva_porcentaje, precio_sin_iva, precio_con_iva, ubicacion, proveedor_nombre }) => ({
            id_producto,
            nombre,
            precio_venta,
            categoria_nombre,
            imagen_url,
            descripcion,
            stock_actual,
            codigo_serie,
            iva_porcentaje,
            precio_sin_iva,
            precio_con_iva,
            ubicacion,
            proveedor_nombre
        }));
        res.json(safeData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getOne = async (req, res) => {
    try {
        const p = await prisma.productos.findUnique({
            where: { id_producto: Number(req.params.id) },
            include: includeRelations
        });
        if (!p) return res.status(404).json({ message: "Producto no encontrado" });
        const row = mapProducto(p);

        let isAdmin = false;
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

        if (token) {
            try {
                const decoded = jwt.verify(token, SECRET_KEY);
                if (decoded && decoded.rol_id === 1) {
                    isAdmin = true;
                }
            } catch (_) {
            }
        }

        if (isAdmin) {
            res.json(row);
        } else {
            const { precio_compra, stock_minimo, ...safeRow } = row;
            res.json(safeRow);
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const checkNombreDuplicado = async (nombre, excludeId = null) => {
    const existing = await prisma.productos.findFirst({
        where: {
            nombre: { equals: nombre },
            ...(excludeId ? { id_producto: { not: excludeId } } : {})
        }
    });
    return !!existing;
};

const store = async (req, res) => {
    try {
        const { nombre } = req.body;
        const sanitizedNombre = nombre?.trim();
        if (!sanitizedNombre || sanitizedNombre.length < 3) {
            return res.status(400).json({ message: "El nombre debe tener al menos 3 caracteres" });
        }

        // Verificar nombre duplicado
        const duplicado = await checkNombreDuplicado(sanitizedNombre);
        if (duplicado) {
            return res.status(409).json({ message: "Ya existe un producto con ese nombre. Use un nombre diferente." });
        }

        const { categoria_id, precio_compra, precio_venta } = req.body;
        if (!categoria_id || precio_compra === undefined || precio_venta === undefined) {
            return res.status(400).json({ message: "La categoría y precios son obligatorios" });
        }

        const imagen_url = req.file
            ? (await uploadToCloudinary(req.file.buffer, 'rematespaisa/productos', {
                allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
                transformation: [{ width: 800, height: 800, crop: 'limit' }, { quality: 'auto' }]
              })).secure_url || null
            : null;

        const result = await prisma.productos.create({
            data: {
                categoria_id: categoria_id ? Number(categoria_id) : null,
                proveedor_id: req.body.proveedor_id ? Number(req.body.proveedor_id) : null,
                nombre: sanitizedNombre,
                descripcion: req.body.descripcion || '',
                imagen_url: imagen_url || null,
                precio_compra: Number(precio_compra),
                precio_venta: Number(precio_venta),
                stock_actual: req.body.stock_actual != null ? Number(req.body.stock_actual) : 0,
                stock_minimo: req.body.stock_minimo != null ? Number(req.body.stock_minimo) : 0,
                activo: true
            }
        });
        res.status(201).json({ message: "Producto creado con éxito", id_producto: result.id_producto });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const update = async (req, res) => {
    try {
        const { id } = req.params;

        let imagen_url = req.body.imagen_url;
        if (req.file) {
            const cloudResult = await uploadToCloudinary(req.file.buffer, 'rematespaisa/productos', {
                allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
                transformation: [{ width: 800, height: 800, crop: 'limit' }, { quality: 'auto' }]
            });
            imagen_url = cloudResult.secure_url || cloudResult.url;

            const p = await prisma.productos.findUnique({
                where: { id_producto: Number(id) },
                include: includeRelations
            });
            const productoActual = p ? mapProducto(p) : null;
            if (productoActual?.imagen_url) {
                try {
                    const urlParts = productoActual.imagen_url.split('/');
                    const folderAndFile = urlParts.slice(-3).join('/');
                    const publicId = folderAndFile.substring(0, folderAndFile.lastIndexOf('.'));
                    await cloudinary.uploader.destroy(publicId);
                } catch (_) {
                }
            }
        }

        const updateData = { ...req.body, imagen_url };
        if (updateData.nombre) {
            updateData.nombre = updateData.nombre.trim();
            if (updateData.nombre.length < 3) return res.status(400).json({ message: "El nombre debe tener al menos 3 caracteres" });
            // Verificar nombre duplicado (excluyendo el producto actual)
            const duplicado = await checkNombreDuplicado(updateData.nombre, Number(id));
            if (duplicado) {
                return res.status(409).json({ message: "Ya existe otro producto con ese nombre. Use un nombre diferente." });
            }
        }

        const result = await prisma.productos.updateMany({
            where: { id_producto: Number(id) },
            data: {
                categoria_id: updateData.categoria_id != null ? Number(updateData.categoria_id) : undefined,
                proveedor_id: updateData.proveedor_id != null ? Number(updateData.proveedor_id) : undefined,
                nombre: updateData.nombre,
                descripcion: updateData.descripcion,
                imagen_url: updateData.imagen_url !== undefined ? updateData.imagen_url : undefined,
                precio_compra: updateData.precio_compra != null ? Number(updateData.precio_compra) : undefined,
                precio_venta: updateData.precio_venta != null ? Number(updateData.precio_venta) : undefined,
                stock_actual: updateData.stock_actual != null ? Number(updateData.stock_actual) : undefined,
                stock_minimo: updateData.stock_minimo != null ? Number(updateData.stock_minimo) : undefined,
                activo: updateData.activo !== undefined ? Boolean(Number(updateData.activo)) : undefined,
            }
        });
        if (!result.count) return res.status(404).json({ message: "Producto no encontrado para actualizar" });
        res.json({ message: "Producto actualizado correctamente" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const destroy = async (req, res) => {
    try {
        const { id } = req.params;

        const p = await prisma.productos.findUnique({
            where: { id_producto: Number(id) },
            include: includeRelations
        });
        const producto = p ? mapProducto(p) : null;
        if (producto?.imagen_url) {
            try {
                const urlParts = producto.imagen_url.split('/');
                const folderAndFile = urlParts.slice(-3).join('/');
                const publicId = folderAndFile.substring(0, folderAndFile.lastIndexOf('.'));
                await cloudinary.uploader.destroy(publicId);
            } catch (_) {
            }
        }

        const result = await prisma.productos.deleteMany({ where: { id_producto: Number(id) } });
        if (!result.count) return res.status(404).json({ message: "Producto no encontrado" });
        res.json({ message: "Producto eliminado" });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ error: "No se puede eliminar este producto porque se usa en inventarios o pedidos." });
        }
        res.status(500).json({ message: error.message });
    }
};

export default { getAll, getPublic, getOne, store, update, destroy };