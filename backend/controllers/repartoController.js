import prisma from '../config/prisma.js';

const obtenerPedidos = async (req, res) => {
    const repartidorId = req.usuario.userId; 

    try {
        const availableOrders = await prisma.pedidos.findMany({
            where: { estado: 'PENDIENTE', repartidor_id: null },
            include: { usuario: true }
        });

        const myOrders = await prisma.pedidos.findMany({
            where: { repartidor_id: repartidorId, estado: 'EN_CAMINO' },
            include: { usuario: true }
        });

        res.json({ available: availableOrders, active: myOrders });
    } catch (error) {
        console.error("Error al obtener pedidos:", error);
        res.status(500).json({ error: 'Error obteniendo pedidos' });
    }
};

const aceptarPedido = async (req, res) => {
    const { id_pedido } = req.params;
    const repartidorId = req.usuario.userId;

    try {
        // ACTUALIZACIÓN CONDICIONAL ATÓMICA para evitar condiciones de carrera (concurrencia)
        const result = await prisma.pedidos.updateMany({
            where: { 
                id_pedido: parseInt(id_pedido),
                estado: 'PENDIENTE',
                repartidor_id: null 
            },
            data: {
                estado: 'EN_CAMINO',
                repartidor_id: repartidorId,
                fecha_asignacion: new Date()
            }
        });

        if (result.count === 0) {
            return res.status(409).json({ error: 'El pedido ya no está disponible.' });
        }

        await prisma.seguimiento_pedido.create({
            data: {
                pedido_id: parseInt(id_pedido),
                estado_anterior: 'PENDIENTE',
                estado_nuevo: 'EN_CAMINO',
                cambiado_por: repartidorId,
                notas: 'Repartidor aceptó el pedido'
            }
        });

        res.json({ message: 'Pedido aceptado exitosamente.' });
    } catch (error) {
        console.error("Error al aceptar pedido:", error);
        res.status(500).json({ error: 'Error al aceptar el pedido.' });
    }
};

const entregarPedido = async (req, res) => {
    const { id_pedido } = req.params;
    const repartidorId = req.usuario.userId;

    try {
        const result = await prisma.pedidos.updateMany({
            where: { 
                id_pedido: parseInt(id_pedido),
                estado: 'EN_CAMINO',
                repartidor_id: repartidorId 
            },
            data: {
                estado: 'ENTREGADO',
                fecha_entrega_real: new Date()
            }
        });

        if (result.count === 0) {
            return res.status(400).json({ error: 'No se pudo confirmar la entrega. Verifique el estado del pedido.' });
        }

        await prisma.seguimiento_pedido.create({
            data: {
                pedido_id: parseInt(id_pedido),
                estado_anterior: 'EN_CAMINO',
                estado_nuevo: 'ENTREGADO',
                cambiado_por: repartidorId,
                notas: 'Pedido entregado por repartidor'
            }
        });

        res.json({ message: 'Entrega confirmada.' });
    } catch (error) {
        console.error("Error al entregar pedido:", error);
        res.status(500).json({ error: 'Error al confirmar la entrega.' });
    }
};

export default { obtenerPedidos, aceptarPedido, entregarPedido };
