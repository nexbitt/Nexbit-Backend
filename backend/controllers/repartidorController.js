/**
 * @file repartidorController.js
 * @description Controlador para la gestión de repartidores y asignación de pedidos.
 */
import prisma from '../config/prisma.js';

const repartidorController = {
    getAll: async (req, res) => {
        try {
            const rows = await prisma.usuarios.findMany({
                where: { rol_id: 4 },
                select: {
                    id_usuario: true,
                    nombre: true,
                    telefono: true,
                    email: true,
                    activo: true,
                    pedidos_repartidor: { select: { estado: true } }
                }
            });
            const repartidores = rows.map(r => {
                const pedidos = r.pedidos_repartidor || [];
                return {
                    id_usuario: r.id_usuario,
                    nombre: r.nombre,
                    telefono: r.telefono,
                    email: r.email,
                    activo: r.activo,
                    total_pedidos: pedidos.length,
                    pedidos_activos: pedidos.filter(p => p.estado === 'ASIGNADO' || p.estado === 'EN_CAMINO').length
                };
            });
            res.json(repartidores);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    getById: async (req, res) => {
        try {
            const r = await prisma.usuarios.findUnique({
                where: { id_usuario: Number(req.params.id) },
                include: {
                    pedidos_repartidor: {
                        include: {
                            usuario: { select: { nombre: true } },
                            detalle_pedido: {
                                include: { producto: { select: { nombre: true } } }
                            },
                            seguimiento_pedido: {
                                include: { usuario: { select: { nombre: true } } },
                                orderBy: { fecha: 'desc' }
                            }
                        },
                        orderBy: { fecha_pedido: 'desc' }
                    }
                }
            });
            if (!r) return res.status(404).json({ error: 'Repartidor no encontrado' });
            if (r.pedidos_repartidor) {
                r.pedidos_repartidor = r.pedidos_repartidor.map(p => ({
                    ...p,
                    cliente: p.usuario,
                    seguimiento: p.seguimiento_pedido
                }));
            }
            res.json(r);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    toggleActivo: async (req, res) => {
        try {
            const { activo } = req.body;
            await prisma.usuarios.update({
                where: { id_usuario: Number(req.params.id) },
                data: { activo }
            });
            res.json({ message: 'Estado del repartidor actualizado exitosamente' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    asignarPedido: async (req, res) => {
        try {
            const { pedido_id } = req.body;
            await prisma.$transaction(async (tx) => {
                const pedido = await tx.pedidos.findUnique({
                    where: { id_pedido: Number(pedido_id) },
                    select: { id_pedido: true, repartidor_id: true, estado: true }
                });
                if (!pedido) throw new Error('Pedido no encontrado');
                if (pedido.repartidor_id !== null) {
                    throw new Error('El pedido ya fue asignado a otro repartidor');
                }
                return tx.pedidos.update({
                    where: { id_pedido: Number(pedido_id) },
                    data: {
                        repartidor_id: Number(req.params.id),
                        estado: 'ASIGNADO',
                        fecha_asignacion: new Date()
                    }
                });
            });
            res.json({ message: 'Pedido asignado exitosamente al repartidor' });
        } catch (error) {
            if (error.message === 'El pedido ya fue asignado a otro repartidor') {
                return res.status(409).json({ message: error.message });
            }
            res.status(500).json({ message: error.message });
        }
    },

    desasignarPedido: async (req, res) => {
        try {
            await prisma.pedidos.update({
                where: { id_pedido: Number(req.params.pedidoId) },
                data: {
                    repartidor_id: null,
                    estado: 'APROBADO',
                    fecha_asignacion: null
                }
            });
            res.json({ message: 'Pedido desasignado exitosamente' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    cambiarEstadoPedido: async (req, res) => {
        try {
            const { estado, notas } = req.body;
            const usuario_id = req.usuario?.userId;
            const pedido = await prisma.pedidos.findUnique({ where: { id_pedido: Number(req.params.pedidoId) } });
            if (!pedido) throw new Error("Pedido no encontrado");
            await prisma.$transaction([
                prisma.pedidos.update({
                    where: { id_pedido: Number(req.params.pedidoId) },
                    data: {
                        estado,
                        fecha_entrega_real: estado === 'ENTREGADO' ? new Date() : undefined
                    }
                }),
                prisma.seguimiento_pedido.create({
                    data: {
                        pedido_id: Number(req.params.pedidoId),
                        estado_anterior: pedido.estado,
                        estado_nuevo: estado,
                        cambiado_por: Number(usuario_id),
                        notas: notas || null
                    }
                })
            ]);
            res.json({ message: 'Estado del pedido actualizado exitosamente' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    getPedidosSinAsignar: async (req, res) => {
        try {
            const pedidos = await prisma.pedidos.findMany({
                where: { repartidor_id: null, estado: { in: ['APROBADO'] } },
                include: { usuario: { select: { nombre: true } } }
            });
            res.json(pedidos.map(p => ({ ...p, cliente: p.usuario })));
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};

export default repartidorController;
