import prisma from '../config/prisma.js';

const findCart = async (usuario_id, session_id) => {
    if (!usuario_id && !session_id) return [];
    const where = usuario_id
        ? { usuario_id: Number(usuario_id) }
        : { session_id, usuario_id: null };
    const rows = await prisma.carrito.findMany({
        where,
        include: { producto: { select: { nombre: true, precio_venta: true, stock_actual: true, imagen_url: true } } }
    });
    return rows.map(item => ({
        id_carrito: item.id_carrito,
        usuario_id: item.usuario_id,
        session_id: item.session_id,
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        nombre: item.producto.nombre,
        precio: item.producto.precio_venta,
        subtotal: Number(item.cantidad) * Number(item.producto.precio_venta),
        stock_actual: item.producto.stock_actual,
        imagen_url: item.producto.imagen_url || null
    }));
};

const findCartItem = async (usuario_id, session_id, producto_id) => {
    if (!usuario_id && !session_id) return null;
    const where = {
        producto_id: Number(producto_id),
        ...(usuario_id
            ? { usuario_id: Number(usuario_id) }
            : { session_id, usuario_id: null })
    };
    return prisma.carrito.findFirst({ where });
};

const getCart = async (req, res) => {
    try {
        const { usuario_id, session_id } = req.query;
        const items = await findCart(usuario_id, session_id);
        res.json(items);
    } catch (error) {
        console.error("Error al obtener carrito:", error);
        res.status(500).json({ message: error.message });
    }
};

const add = async (req, res) => {
    try {
        const { usuario_id, session_id, producto_id, cantidad } = req.body;
        if (!producto_id || !cantidad) {
            return res.status(400).json({ message: "Producto y cantidad obligatorios" });
        }

        const existing = await findCartItem(usuario_id, session_id, producto_id);
        if (existing) {
            await prisma.carrito.updateMany({
                where: { id_carrito: existing.id_carrito },
                data: { cantidad: existing.cantidad + Number(cantidad) }
            });
        } else {
            await prisma.carrito.create({
                data: {
                    usuario_id: usuario_id ? Number(usuario_id) : null,
                    session_id: session_id || null,
                    producto_id: Number(producto_id),
                    cantidad: Number(cantidad)
                }
            });
        }

        const cart = await findCart(usuario_id, session_id);
        res.json(cart);
    } catch (error) {
        console.error("Error al agregar item:", error);
        res.status(500).json({ message: error.message });
    }
};

const updateCart = async (req, res) => {
    try {
        const { id_carrito } = req.params;
        const { cantidad, usuario_id, session_id } = req.body;
        await prisma.carrito.updateMany({
            where: { id_carrito: Number(id_carrito) },
            data: { cantidad: Number(cantidad) }
        });
        const cart = await findCart(usuario_id, session_id);
        res.json(cart);
    } catch (error) {
        console.error("Error al actualizar item:", error);
        res.status(500).json({ message: error.message });
    }
};

const remove = async (req, res) => {
    try {
        const { producto_id } = req.params;
        const { usuario_id, session_id } = req.query;

        if (usuario_id || session_id) {
            const where = {
                producto_id: Number(producto_id),
                ...(usuario_id
                    ? { usuario_id: Number(usuario_id) }
                    : { session_id, usuario_id: null })
            };
            await prisma.carrito.deleteMany({ where });
        }

        const cart = await findCart(usuario_id, session_id);
        res.json(cart);
    } catch (error) {
        console.error("Error al eliminar item:", error);
        res.status(500).json({ message: error.message });
    }
};

const clear = async (req, res) => {
    try {
        const { usuario_id, session_id } = req.body;
        if (usuario_id || session_id) {
            const where = usuario_id
                ? { usuario_id: Number(usuario_id) }
                : { session_id, usuario_id: null };
            await prisma.carrito.deleteMany({ where });
        }
        res.json([]);
    } catch (error) {
        console.error("Error al vaciar carrito:", error);
        res.status(500).json({ message: error.message });
    }
};

const merge = async (req, res) => {
    try {
        const { session_id, usuario_id } = req.body;
        if (session_id && usuario_id) {
            await prisma.carrito.updateMany({
                where: { session_id, usuario_id: null },
                data: { usuario_id: Number(usuario_id), session_id: null }
            });
        }
        const cart = await findCart(usuario_id, session_id);
        res.json(cart);
    } catch(error) {
        console.error("Error al fusionar:", error);
        res.status(500).json({ message: error.message });
    }
};

export default {
    getCart,
    add,
    update: updateCart,
    remove,
    clear,
    merge
};