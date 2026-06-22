/**
 * @file pedidoController.js
 * @description Controlador para la gestión de pedidos y transacciones de checkout.
 */
import { v2 as cloudinary } from 'cloudinary';
import Pedido from '../models/pedidoModel.js';
import prisma from '../config/prisma.js';
import { getIO } from '../socket.js';

const getAll = async (req, res) => {
    try {
        const data = await Pedido.findAll();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getOne = async (req, res) => {
    try {
        const row = await Pedido.findById(req.params.id);
        if (!row) return res.status(404).json({ message: "Pedido no encontrado" });
        res.json(row);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const checkout = async (req, res) => {
    try {
        const { usuario_id } = req.body;
        if (!usuario_id) return res.status(400).json({ message: "Se requiere usuario activo" });

        const cartItems = await prisma.carrito.findMany({
            where: { usuario_id: Number(usuario_id) },
            include: { producto: { select: { precio_venta: true, nombre: true } } }
        });

        if (cartItems.length === 0) return res.status(400).json({ message: "El carrito está vacío" });

        for (const item of cartItems) {
            const producto = await prisma.productos.findUnique({
                where: { id_producto: item.producto_id },
                select: { stock_actual: true, nombre: true }
            });
            if (!producto || producto.stock_actual < item.cantidad) {
                return res.status(400).json({
                    message: `Stock insuficiente para: ${producto?.nombre}`
                });
            }
        }

        const total = cartItems.reduce((acc, item) =>
            acc + (item.cantidad * Number(item.producto.precio_venta)), 0
        );

        const transactionResult = await prisma.$transaction(async (tx) => {
            const pedido = await tx.pedidos.create({
                data: { usuario_id: Number(usuario_id), total, estado: 'PENDIENTE' }
            });
            for (const item of cartItems) {
                const precio = Number(item.producto.precio_venta);
                await tx.detalle_pedido.create({
                    data: {
                        pedido_id: pedido.id_pedido,
                        producto_id: item.producto_id,
                        cantidad: item.cantidad,
                        precio_unitario: precio,
                        subtotal: item.cantidad * precio
                    }
                });
                
                await tx.productos.update({
                    where: { id_producto: item.producto_id },
                    data: {
                        stock_actual: { decrement: item.cantidad }
                    }
                });
            }
            await tx.carrito.deleteMany({ where: { usuario_id: Number(usuario_id) } });
            return pedido;
        });

        // Obtener datos bancarios para mostrar al cliente
        const cuentasBancarias = await prisma.configuracion_bancaria.findMany({
            where: { activo: true },
            select: { banco: true, tipo_cuenta: true, numero_cuenta: true, titular: true, documento: true, descripcion: true }
        });

        const io = getIO();
        io.to('admin').emit('notificacion:nuevo-pedido', {
            pedido_id: transactionResult.id_pedido,
            titulo: `Nuevo pedido #${transactionResult.id_pedido}`,
            mensaje: 'Un cliente ha realizado un nuevo pedido.'
        });

        res.status(201).json({
            message: "Pedido procesado con éxito",
            id_pedido: transactionResult.id_pedido,
            datos_bancarios: cuentasBancarias,
            total: Number(total)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const store = async (req, res) => {
    try {
        const { usuario_id, comprobante_pago_url } = req.body;
        if (!usuario_id) return res.status(400).json({ message: "El ID del usuario es obligatorio" });

        const data = { ...req.body };
        if (comprobante_pago_url) {
            data.estado = 'EN_REVISION';
        } else {
            data.estado = 'PENDIENTE';
        }
        const id = await Pedido.create(data);

        if (comprobante_pago_url) {
            await prisma.seguimiento_pedido.create({
                data: {
                    pedido_id: id,
                    estado_anterior: null,
                    estado_nuevo: 'EN_REVISION',
                    cambiado_por: Number(usuario_id),
                    notas: 'Administrador creó pedido con comprobante de pago'
                }
            });

            const admins = await prisma.usuarios.findMany({
                where: { rol_id: 1, activo: true },
                select: { id_usuario: true }
            });
            for (const admin of admins) {
                await prisma.notificaciones.create({
                    data: {
                        usuario_id: admin.id_usuario,
                        tipo: 'COMPROBANTE_SUBIDO',
                        titulo: `Nuevo comprobante de pago - Pedido #${id}`,
                        mensaje: `Se ha creado el pedido #${id} con comprobante de pago. Revisa y aprueba el pago.`,
                        pedido_id: id
                    }
                });
            }
            const io = getIO();
            io.to('admin').emit('notificacion:nuevo-comprobante', {
                pedido_id: id,
                titulo: `Nuevo comprobante de pago - Pedido #${id}`,
                mensaje: 'Se ha creado un pedido con comprobante de pago para revisión.'
            });
        }

        res.status(201).json({ message: "Pedido creado con éxito", id_pedido: id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const update = async (req, res) => {
    try {
        const { id } = req.params;
        const actualizado = await Pedido.update(id, req.body);
        if (!actualizado) return res.status(404).json({ message: "Pedido no encontrado" });
        res.json({ message: "Pedido actualizado" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const destroy = async (req, res) => {
    try {
        const { id } = req.params;
        const eliminado = await Pedido.delete(id);
        if (!eliminado) return res.status(404).json({ message: "Pedido no encontrado" });
        res.json({ message: "Pedido eliminado" });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ error: "No se puede eliminar este pedido porque tiene facturas o detalles asociados." });
        }
        res.status(500).json({ error: error.message });
    }
};

const getTicket = async (req, res) => {
    try {
        const pedido = await Pedido.findByIdWithDetails(req.params.id);
        if (!pedido) return res.status(404).json({ message: "Pedido no encontrado" });
        res.json(pedido);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
const cancelar = async (req, res) => {
    try {
        const { id } = req.params;
        const pedido = await Pedido.findById(id);

        if (!pedido) {
            return res.status(404).json({ message: "Pedido no encontrado" });
        }

        // Regla RF011: Solo cancelar si está PENDIENTE
        if (pedido.estado !== 'PENDIENTE') {
            return res.status(400).json({
                message: "No se puede cancelar un pedido que ya no está PENDIENTE"
            });
        }

        // LLAMADA A LA NUEVA FUNCIÓN DEL MODELO
        const actualizado = await Pedido.updateStatus(id, 'CANCELADO');

        if (actualizado) {
            res.json({ message: "Pedido cancelado con éxito" });
        } else {
            res.status(500).json({ message: "No se pudo actualizar el estado" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const subirComprobante = async (req, res) => {
    try {
        const { id } = req.params;
        const pedido = await Pedido.findById(id);
        if (!pedido) return res.status(404).json({ message: "Pedido no encontrado" });
        if (pedido.estado !== 'PENDIENTE' && pedido.estado !== 'RECHAZADO') {
            return res.status(400).json({ message: "El pedido debe estar en estado Pendiente o Rechazado" });
        }
        if (!req.file) return res.status(400).json({ message: "Debe subir un archivo de imagen" });

        // Si ya hay un comprobante anterior, eliminarlo de Cloudinary
        if (pedido.comprobante_pago_url) {
            try {
                const urlParts = pedido.comprobante_pago_url.split('/');
                const folderAndFile = urlParts.slice(-3).join('/');
                const publicId = folderAndFile.substring(0, folderAndFile.lastIndexOf('.'));
                await cloudinary.uploader.destroy(publicId);
            } catch (_) {
                // No interrumpir si falla la limpieza
            }
        }

        const comprobanteUrl = req.file.secure_url || req.file.url || req.file.path;
        const comprobantePublicId = req.file.public_id || req.file.filename || null;
        const actualizado = await prisma.pedidos.updateMany({
            where: { id_pedido: Number(id) },
            data: {
                comprobante_pago_url: comprobanteUrl,
                comprobante_pago_public_id: comprobantePublicId,
                estado: 'EN_REVISION'
            }
        });

        if (!actualizado) return res.status(500).json({ message: "No se pudo actualizar el comprobante" });

        const estadoAnterior = pedido.estado;

        await prisma.seguimiento_pedido.create({
            data: {
                pedido_id: Number(id),
                estado_anterior: estadoAnterior,
                estado_nuevo: 'EN_REVISION',
                cambiado_por: pedido.usuario_id,
                notas: estadoAnterior === 'RECHAZADO'
                    ? 'Cliente re-subió comprobante de pago tras rechazo'
                    : 'Cliente subió comprobante de pago'
            }
        });

        const admins = await prisma.usuarios.findMany({
            where: { rol_id: 1, activo: true },
            select: { id_usuario: true }
        });

        for (const admin of admins) {
            await prisma.notificaciones.create({
                data: {
                    usuario_id: admin.id_usuario,
                    tipo: 'COMPROBANTE_SUBIDO',
                    titulo: `Nuevo comprobante de pago - Pedido #${id}`,
                    mensaje: `El cliente ha subido un comprobante de pago para el pedido #${id}. Revisa y aprueba el pago.`,
                    pedido_id: Number(id)
                }
            });
        }

        const io = getIO();
        io.to('admin').emit('notificacion:nuevo-comprobante', {
            pedido_id: Number(id),
            titulo: `Nuevo comprobante de pago - Pedido #${id}`,
            mensaje: 'Un cliente ha subido un comprobante de pago para revisión.'
        });

        res.json({ message: "Comprobante subido con éxito. Pedido en revisión." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const aprobarPago = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.usuario.userId;
        const pedido = await Pedido.findById(id);
        if (!pedido) return res.status(404).json({ message: "Pedido no encontrado" });
        if (pedido.estado !== 'EN_REVISION') {
            return res.status(400).json({ message: "El pedido no está en revisión" });
        }

        const actualizado = await Pedido.updateStatus(id, 'APROBADO');
        if (!actualizado) return res.status(500).json({ message: "No se pudo aprobar el pago" });

        await prisma.seguimiento_pedido.create({
            data: {
                pedido_id: Number(id),
                estado_anterior: 'EN_REVISION',
                estado_nuevo: 'APROBADO',
                cambiado_por: adminId,
                notas: 'Administrador aprobó el pago'
            }
        });

        await prisma.notificaciones.create({
            data: {
                usuario_id: pedido.usuario_id,
                tipo: 'PAGO_APROBADO',
                titulo: `Pago aprobado - Pedido #${id}`,
                mensaje: 'Tu pago ha sido aprobado. Tu pedido ya está disponible para entrega.',
                pedido_id: Number(id)
            }
        });

        const io = getIO();
        io.to(`usuario:${pedido.usuario_id}`).emit('notificacion:pago-aprobado', {
            pedido_id: Number(id),
            mensaje: 'Tu pago ha sido aprobado. Tu pedido está en proceso.'
        });

        res.json({ message: "Pago aprobado. Pedido listo para entrega." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const rechazarPago = async (req, res) => {
    try {
        const { id } = req.params;
        const { motivo } = req.body;
        const adminId = req.usuario.userId;
        const pedido = await Pedido.findById(id);
        if (!pedido) return res.status(404).json({ message: "Pedido no encontrado" });
        if (pedido.estado !== 'EN_REVISION') {
            return res.status(400).json({ message: "El pedido no está en revisión" });
        }

        const actualizado = await Pedido.updateStatusWithMotivo(id, 'RECHAZADO', motivo || 'Pago rechazado');
        if (!actualizado) return res.status(500).json({ message: "No se pudo rechazar el pago" });

        await prisma.seguimiento_pedido.create({
            data: {
                pedido_id: Number(id),
                estado_anterior: 'EN_REVISION',
                estado_nuevo: 'RECHAZADO',
                cambiado_por: adminId,
                notas: motivo || 'Administrador rechazó el pago'
            }
        });

        await prisma.notificaciones.create({
            data: {
                usuario_id: pedido.usuario_id,
                tipo: 'PAGO_RECHAZADO',
                titulo: `Pago rechazado - Pedido #${id}`,
                mensaje: `Tu pago ha sido rechazado. Motivo: ${motivo || 'Pago no válido'}. Contacta al administrador para más información.`,
                pedido_id: Number(id)
            }
        });

        const io = getIO();
        io.to(`usuario:${pedido.usuario_id}`).emit('notificacion:pago-rechazado', {
            pedido_id: Number(id),
            mensaje: `Tu pago ha sido rechazado: ${motivo || 'Pago no válido'}`
        });

        res.json({ message: "Pago rechazado. Se notificará al cliente." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const pedidosEnRevision = async (req, res) => {
    try {
        const data = await prisma.pedidos.findMany({
            where: { estado: 'EN_REVISION' },
            orderBy: { fecha_pedido: 'desc' },
            include: {
                usuario: { select: { nombre: true, email: true, telefono: true } },
                detalle_pedido: {
                    include: { producto: { select: { nombre: true, imagen_url: true } } }
                }
            }
        });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const verificarPedidoActivo = async (req, res) => {
    try {
        const { usuario_id } = req.params;
        const pedido = await prisma.pedidos.findFirst({
            where: {
                usuario_id: Number(usuario_id),
                estado: { in: ['EN_REVISION', 'PENDIENTE'] }
            },
            select: { id_pedido: true, estado: true }
        });
        res.json({ tienePedidoActivo: !!pedido, pedido });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const enviarComentario = async (req, res) => {
    try {
        const { id } = req.params;
        const { comentario } = req.body;
        const adminId = req.usuario.userId;
        const pedido = await Pedido.findById(id);
        if (!pedido) return res.status(404).json({ message: "Pedido no encontrado" });
        if (!comentario || !comentario.trim()) {
            return res.status(400).json({ message: "El comentario es obligatorio" });
        }

        const estadosValidos = ['EN_REVISION', 'PENDIENTE', 'APROBADO', 'RECHAZADO'];
        if (!estadosValidos.includes(pedido.estado)) {
            return res.status(400).json({ message: "No se pueden enviar comentarios en este estado" });
        }

        await prisma.seguimiento_pedido.create({
            data: {
                pedido_id: Number(id),
                estado_anterior: pedido.estado,
                estado_nuevo: pedido.estado,
                cambiado_por: adminId,
                notas: `COMENTARIO: ${comentario.trim()}`
            }
        });

        res.json({ message: "Comentario enviado con éxito" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const softDelete = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.usuario.userId;
        const pedido = await Pedido.findById(id);
        if (!pedido) return res.status(404).json({ message: "Pedido no encontrado" });
        if (pedido.usuario_id !== userId) {
            return res.status(403).json({ message: "No puedes eliminar un pedido que no te pertenece" });
        }
        const eliminado = await Pedido.softDelete(id);
        if (!eliminado) return res.status(404).json({ message: "Pedido no encontrado" });
        res.json({ message: "Pedido movido a la papelera" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const restore = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.usuario.userId;
        const pedido = await Pedido.findById(id);
        if (!pedido) return res.status(404).json({ message: "Pedido no encontrado" });
        if (pedido.usuario_id !== userId) {
            return res.status(403).json({ message: "No puedes restaurar un pedido que no te pertenece" });
        }
        const restaurado = await Pedido.restore(id);
        if (!restaurado) return res.status(404).json({ message: "Pedido no encontrado" });
        res.json({ message: "Pedido restaurado de la papelera" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getTrash = async (req, res) => {
    try {
        const userId = req.usuario.userId;
        const data = await Pedido.findDeletedByUser(userId);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export default { getAll, getOne, checkout, store, update, destroy, getTicket, cancelar, subirComprobante, aprobarPago, rechazarPago, pedidosEnRevision, verificarPedidoActivo, enviarComentario, softDelete, restore, getTrash };