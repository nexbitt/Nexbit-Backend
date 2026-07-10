/**
 * @file facturaController.js
 * @description Controlador para la gestión de facturas.
 */
import prisma from '../config/prisma.js';

const getAll = async (req, res) => {
    try {
        const rows = await prisma.facturas.findMany({
            orderBy: { id_factura: 'asc' },
            include: { pedido: { select: { estado: true } } }
        });
        const data = rows.map(f => ({ ...f, pedido_estado: f.pedido?.estado, pedido: undefined }));
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getOne = async (req, res) => {
    try {
        const row = await prisma.facturas.findUnique({ where: { id_factura: Number(req.params.id) } });
        if (!row) return res.status(404).json({ message: "Factura no encontrada" });
        res.json(row);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const store = async (req, res) => {
    try {
        const { pedido_id, numero_factura, subtotal, impuesto, total, estado } = req.body;
        if (!pedido_id || !numero_factura) return res.status(400).json({ message: "ID del pedido y numero de factura son obligatorios" });
        const result = await prisma.facturas.create({
            data: {
                pedido_id: Number(pedido_id),
                numero_factura,
                subtotal: subtotal || 0,
                impuesto: impuesto || 0,
                total: total || 0,
                estado: estado || 'EMITIDA'
            }
        });
        res.status(201).json({ message: "Factura generada con éxito", id_factura: result.id_factura });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const update = async (req, res) => {
    try {
        const { id } = req.params;
        const { numero_factura, subtotal, impuesto, total, estado } = req.body;
        const result = await prisma.facturas.updateMany({
            where: { id_factura: Number(id) },
            data: { numero_factura, subtotal, impuesto, total, estado }
        });
        if (!result.count) return res.status(404).json({ message: "Factura no encontrada" });
        res.json({ message: "Factura actualizada" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const destroy = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await prisma.facturas.deleteMany({ where: { id_factura: Number(id) } });
        if (!result.count) return res.status(404).json({ message: "Factura no encontrada" });
        res.json({ message: "Factura eliminada" });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ error: "No se puede eliminar esta factura porque tiene detalles asociados." });
        }
        res.status(500).json({ message: error.message });
    }
};

export default { getAll, getOne, store, update, destroy };