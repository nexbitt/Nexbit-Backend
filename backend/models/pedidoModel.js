import prisma from '../config/prisma.js';

const Pedido = {
    findAll: async (onlyActive = true) => {
        const where = onlyActive ? { status_pedido: 'activo' } : {};
        const rows = await prisma.pedidos.findMany({
            where,
            orderBy: { id_pedido: 'asc' },
            include: {
                usuario: { select: { nombre: true } },
                seguimiento_pedido: {
                    orderBy: { fecha: 'desc' },
                    take: 2,
                    select: { notas: true, estado_nuevo: true, cambiado_por: true, fecha: true },
                },
            },
        });
        return rows.map(p => {
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
                ...p,
                usuario_nombre: p.usuario?.nombre,
                usuario: undefined,
                seguimiento_pedido: undefined,
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
    },

    findById: async (id) => {
        const p = await prisma.pedidos.findUnique({
            where: { id_pedido: Number(id) },
            include: { usuario: { select: { nombre: true } } }
        });
        if (!p) return undefined;
        return { ...p, usuario_nombre: p.usuario?.nombre, usuario: undefined };
    },

    create: async (data) => {
        const { usuario_id, subtotal, impuesto, total, estado, direccion_entrega, notas_entrega, simulado_por_admin, admin_id_operador, auditoria_nota } = data;
        const result = await prisma.pedidos.create({
            data: {
                usuario_id: Number(usuario_id),
                subtotal: subtotal || 0,
                impuesto: impuesto || 0,
                total: total || 0,
                estado: estado || 'PENDIENTE',
                direccion_entrega: direccion_entrega || null,
                notas_entrega: notas_entrega || null,
                simulado_por_admin: simulado_por_admin || false,
                admin_id_operador: admin_id_operador ? Number(admin_id_operador) : null,
                auditoria_nota: auditoria_nota || null
            }
        });
        return result.id_pedido;
    },

    update: async (id, data) => {
        const { subtotal, impuesto, total, estado } = data;
        const result = await prisma.pedidos.updateMany({
            where: { id_pedido: Number(id) },
            data: { subtotal, impuesto, total, estado }
        });
        return result.count > 0;
    },

    updateComprobante: async (id, comprobantePagoUrl) => {
        const result = await prisma.pedidos.updateMany({
            where: { id_pedido: Number(id) },
            data: { comprobante_pago_url: comprobantePagoUrl, estado: 'EN_REVISION' }
        });
        return result.count > 0;
    },

    updateStatusWithMotivo: async (id, estado, motivo) => {
        const result = await prisma.pedidos.updateMany({
            where: { id_pedido: Number(id) },
            data: { estado, ...(motivo ? { motivo_rechazo: motivo } : {}) }
        });
        return result.count > 0;
    },

    // Actualizar solo el estado
    updateStatus: async (id, estado) => {
        const result = await prisma.pedidos.updateMany({
            where: { id_pedido: Number(id) },
            data: { estado }
        });
        return result.count > 0;
    },

    delete: async (id) => {
        const result = await prisma.pedidos.deleteMany({
            where: { id_pedido: Number(id) }
        });
        return result.count > 0;
    },

    softDelete: async (id) => {
        const result = await prisma.pedidos.updateMany({
            where: { id_pedido: Number(id) },
            data: { status_pedido: 'eliminado_usuario' }
        });
        return result.count > 0;
    },

    restore: async (id) => {
        const result = await prisma.pedidos.updateMany({
            where: { id_pedido: Number(id) },
            data: { status_pedido: 'activo' }
        });
        return result.count > 0;
    },

    findDeletedByUser: async (usuarioId) => {
        const rows = await prisma.pedidos.findMany({
            where: {
                usuario_id: Number(usuarioId),
                status_pedido: 'eliminado_usuario'
            },
            orderBy: { fecha_pedido: 'desc' },
            include: {
                seguimiento_pedido: {
                    orderBy: { fecha: 'desc' },
                    take: 1,
                    select: { notas: true, estado_nuevo: true, fecha: true },
                },
            },
        });
        return rows.map(p => {
            const events = p.seguimiento_pedido || [];
            return {
                ...p,
                seguimiento_pedido: undefined,
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
    },

    findByIdWithDetails: async (id) => {
        const pedido = await prisma.pedidos.findUnique({
            where: { id_pedido: Number(id) },
            include: {
                usuario: { select: { nombre: true, email: true, numero_documento: true, telefono: true, direccion: true } },
                detalle_pedido: {
                    orderBy: { id_detalle_pedido: 'asc' },
                    include: { producto: { select: { nombre: true, imagen_url: true } } }
                }
            }
        });
        if (!pedido) return null;

        // Aplanar para compatibilidad con el frontend/controllers
        return {
            ...pedido,
            usuario_nombre:     pedido.usuario?.nombre,
            usuario_email:      pedido.usuario?.email,
            numero_documento:   pedido.usuario?.numero_documento,
            usuario_telefono:   pedido.usuario?.telefono,
            direccion:          pedido.usuario?.direccion,
            usuario: undefined,
            detalles: pedido.detalle_pedido.map(d => ({
                ...d,
                producto_nombre: d.producto?.nombre,
                imagen_url:      d.producto?.imagen_url || null,
                producto: undefined
            })),
            detalle_pedido: undefined
        };
    }
};

export default Pedido;