import prisma from '../config/prisma.js';
import { getIO, emitNuevoPedidoDisponible } from '../socket.js';

const adminController = {
    listarPedidos: async (req, res) => {
        try {
            const { estado, status_pedido, search, filterFecha } = req.query;
            const where = {};
            if (estado) where.estado = estado;
            if (status_pedido) where.status_pedido = status_pedido;

            if (search) {
                const searchConditions = [
                    { usuario: { nombre: { contains: search } } },
                    { usuario: { numero_documento: { contains: search } } },
                ];
                const searchId = parseInt(search, 10);
                if (!isNaN(searchId)) {
                    searchConditions.push({ id_pedido: searchId });
                }
                where.OR = searchConditions;
            }

            if (filterFecha) {
                const now = new Date();
                let startDate;
                switch (filterFecha) {
                    case 'today':
                        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        break;
                    case 'week':
                        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        break;
                    case 'month':
                        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                        break;
                }
                if (startDate) {
                    where.fecha_pedido = { gte: startDate };
                }
            }

            const pedidos = await prisma.pedidos.findMany({
                where,
                orderBy: { fecha_pedido: 'desc' },
                include: {
                    usuario: {
                        select: { id_usuario: true, nombre: true, email: true, telefono: true }
                    },
                    repartidor: {
                        select: { id_usuario: true, nombre: true }
                    },
                    detalle_pedido: {
                        include: { producto: { select: { nombre: true, imagen_url: true } } }
                    },
                    seguimiento_pedido: {
                        orderBy: { fecha: 'desc' },
                        take: 1,
                        select: { notas: true, fecha: true }
                    }
                }
            });

            const result = pedidos.map(p => {
                const events = p.seguimiento_pedido || [];
                const problemaEvent = events.find(e =>
                    e.notas?.includes('PROBLEMA') ||
                    e.notas?.includes('Cancelado por repartidor')
                );
                const alertEvent = problemaEvent || events[0];
                const tieneAlerta = alertEvent &&
                    (alertEvent.notas?.includes('PROBLEMA') ||
                     alertEvent.notas?.includes('Cancelado por repartidor') ||
                     alertEvent.notas?.includes('Liberación automática')) &&
                    p.estado !== 'ENTREGADO';

                return {
                    id_pedido: p.id_pedido,
                    usuario_id: p.usuario_id,
                    usuario_nombre: p.usuario?.nombre || 'Desconocido',
                    cliente_email: p.usuario?.email,
                    cliente_telefono: p.usuario?.telefono,
                    repartidor: p.repartidor?.nombre || null,
                    subtotal: Number(p.subtotal),
                    impuesto: Number(p.impuesto),
                    total: Number(p.total),
                    estado: p.estado,
                    status_pedido: p.status_pedido,
                    direccion_entrega: p.direccion_entrega,
                    notas_entrega: p.notas_entrega,
                    comprobante_pago_url: p.comprobante_pago_url,
                    nota_admin: p.nota_admin,
                    motivo_rechazo: p.motivo_rechazo,
                    fecha: p.fecha_pedido,
                    fecha_pedido: p.fecha_pedido,
                    fecha_asignacion: p.fecha_asignacion,
                    fecha_entrega_real: p.fecha_entrega_real,
                    productos: p.detalle_pedido.map(d => ({
                        id: d.id_detalle_pedido,
                        nombre: d.producto?.nombre,
                        cantidad: d.cantidad,
                        precio_unitario: Number(d.precio_unitario),
                        subtotal: Number(d.subtotal),
                        imagen: d.producto?.imagen_url
                    })),
                    ultimo_seguimiento: p.seguimiento_pedido[0] || null,
                    alerta: tieneAlerta
                        ? { motivo: alertEvent.notas, fecha: alertEvent.fecha }
                        : null,
                    fsm_estado:
                        p.estado === 'ENTREGADO' ? 'ENTREGADO' :
                        p.estado === 'CANCELADO' ? 'CANCELADO' :
                        p.estado === 'ASIGNADO' || p.estado === 'EN_CAMINO' ? 'EN_REPARTO' :
                        p.estado === 'APROBADO' && !p.repartidor_id ? 'DISPONIBLE' :
                        p.estado === 'EN_REVISION' ? 'EN_REVISION' :
                        p.estado === 'RECHAZADO' ? 'RECHAZADO' :
                        p.estado,
                };
            });

            res.json(result);
        } catch (error) {
            console.error('Error listar pedidos admin:', error);
            res.status(500).json({ message: error.message });
        }
    },

    obtenerPedido: async (req, res) => {
        try {
            const { id } = req.params;
            const pedido = await prisma.pedidos.findUnique({
                where: { id_pedido: Number(id) },
                include: {
                    usuario: {
                        select: { id_usuario: true, nombre: true, email: true, telefono: true, direccion: true, numero_documento: true }
                    },
                    repartidor: {
                        select: { id_usuario: true, nombre: true, telefono: true }
                    },
                    detalle_pedido: {
                        orderBy: { id_detalle_pedido: 'asc' },
                        include: { producto: { select: { nombre: true, imagen_url: true, precio_venta: true } } }
                    },
                    seguimiento_pedido: {
                        orderBy: { fecha: 'desc' },
                        include: { usuario: { select: { nombre: true } } }
                    }
                }
            });

            if (!pedido) {
                return res.status(404).json({ message: 'Pedido no encontrado' });
            }

            // Aplanar para compatibilidad con el frontend (mismo formato que findByIdWithDetails)
            res.json({
                ...pedido,
                subtotal: Number(pedido.subtotal),
                impuesto: Number(pedido.impuesto),
                total: Number(pedido.total),
                usuario_nombre: pedido.usuario?.nombre,
                usuario_email: pedido.usuario?.email,
                numero_documento: pedido.usuario?.numero_documento,
                usuario_telefono: pedido.usuario?.telefono,
                direccion: pedido.usuario?.direccion,
                usuario: undefined,
                detalles: pedido.detalle_pedido.map(d => ({
                    ...d,
                    producto_nombre: d.producto?.nombre,
                    imagen_url: d.producto?.imagen_url || null,
                    precio_unitario: Number(d.precio_unitario),
                    subtotal: Number(d.subtotal),
                    producto: undefined
                })),
                detalle_pedido: undefined
            });
        } catch (error) {
            console.error('Error obtener pedido admin:', error);
            res.status(500).json({ message: error.message });
        }
    },

    gestionarPedido: async (req, res) => {
        try {
            const { id } = req.params;
            const { accion, nota } = req.body;
            const adminId = req.usuario.userId;

            if (!accion || !['ACEPTAR', 'RECHAZAR', 'CONTACTAR'].includes(accion)) {
                return res.status(400).json({ message: 'Acción inválida. Use: ACEPTAR, RECHAZAR o CONTACTAR' });
            }

            const pedido = await prisma.pedidos.findUnique({
                where: { id_pedido: Number(id) }
            });

            if (!pedido) {
                return res.status(404).json({ message: 'Pedido no encontrado' });
            }

            const io = getIO();

            if (accion === 'ACEPTAR') {
                if (pedido.estado !== 'EN_REVISION') {
                    return res.status(409).json({ message: 'El pedido debe estar en EN_REVISION para aceptarlo' });
                }

                await prisma.pedidos.update({
                    where: { id_pedido: Number(id) },
                    data: {
                        estado: 'APROBADO',
                        nota_admin: nota || null
                    }
                });

                await prisma.seguimiento_pedido.create({
                    data: {
                        pedido_id: Number(id),
                        estado_anterior: 'EN_REVISION',
                        estado_nuevo: 'APROBADO',
                        cambiado_por: adminId,
                        notas: nota || 'Administrador aceptó el pago'
                    }
                });

                await prisma.notificaciones.create({
                    data: {
                        usuario_id: pedido.usuario_id,
                        tipo: 'PAGO_APROBADO',
                        titulo: `Pedido #${id} aceptado`,
                        mensaje: nota || 'Tu pago ha sido aceptado. Tu pedido ya está disponible para entrega.',
                        pedido_id: Number(id)
                    }
                });

                io.to(`usuario:${pedido.usuario_id}`).emit('notificacion:pago-aprobado', {
                    pedido_id: Number(id),
                    mensaje: 'Tu pago ha sido aceptado.'
                });

                io.emit('pedido:disponibles', {
                    pedido_id: Number(id),
                    accion: 'nuevo'
                });
                emitNuevoPedidoDisponible(Number(id), {});

                res.json({ message: 'Pedido aceptado. Ahora es visible para repartidores.' });

            } else if (accion === 'RECHAZAR') {
                if (pedido.estado !== 'EN_REVISION') {
                    return res.status(409).json({ message: 'El pedido debe estar en EN_REVISION para rechazarlo' });
                }

                const motivo = nota || 'Pago rechazado';

                await prisma.pedidos.update({
                    where: { id_pedido: Number(id) },
                    data: {
                        estado: 'RECHAZADO',
                        nota_admin: motivo,
                        motivo_rechazo: motivo
                    }
                });

                await prisma.seguimiento_pedido.create({
                    data: {
                        pedido_id: Number(id),
                        estado_anterior: 'EN_REVISION',
                        estado_nuevo: 'RECHAZADO',
                        cambiado_por: adminId,
                        notas: motivo
                    }
                });

                await prisma.notificaciones.create({
                    data: {
                        usuario_id: pedido.usuario_id,
                        tipo: 'PAGO_RECHAZADO',
                        titulo: `Pedido #${id} rechazado`,
                        mensaje: `Tu pago ha sido rechazado. Motivo: ${motivo}`,
                        pedido_id: Number(id)
                    }
                });

                io.to(`usuario:${pedido.usuario_id}`).emit('notificacion:pago-rechazado', {
                    pedido_id: Number(id),
                    mensaje: `Tu pago ha sido rechazado: ${motivo}`
                });

                res.json({ message: 'Pedido rechazado. Se notificó al cliente.' });

            } else if (accion === 'CONTACTAR') {
                if (!nota || !nota.trim()) {
                    return res.status(400).json({ message: 'Se requiere una nota para contactar al cliente' });
                }

                await prisma.pedidos.update({
                    where: { id_pedido: Number(id) },
                    data: { nota_admin: nota.trim() }
                });

                await prisma.seguimiento_pedido.create({
                    data: {
                        pedido_id: Number(id),
                        estado_anterior: pedido.estado,
                        estado_nuevo: pedido.estado,
                        cambiado_por: adminId,
                        notas: `CONTACTO: ${nota.trim()}`
                    }
                });

                await prisma.notificaciones.create({
                    data: {
                        usuario_id: pedido.usuario_id,
                        tipo: 'NUEVO_MENSAJE',
                        titulo: `Mensaje del administrador - Pedido #${id}`,
                        mensaje: nota.trim(),
                        pedido_id: Number(id)
                    }
                });

                io.to(`usuario:${pedido.usuario_id}`).emit('notificacion:admin-mensaje', {
                    pedido_id: Number(id),
                    mensaje: nota.trim()
                });

                res.json({ message: 'Nota enviada al cliente.' });
            }
        } catch (error) {
            console.error('Error gestionar pedido:', error);
            res.status(500).json({ message: error.message });
        }
    }
};

export default adminController;
