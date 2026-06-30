/**
 * @file facturaController.js
 * @description Controlador para la gestión de facturas.
 */
import Factura from '../models/facturaModel.js';
import { success, error as responseError, notFound, badRequest, unauthorized, forbidden, conflict } from '../utils/responseHelper.js';

const getAll = async (req, res) => {
    try {
        const data = await Factura.findAll();
        success(res, data);
    } catch (error) {
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

const getOne = async (req, res) => {
    try {
        const row = await Factura.findById(req.params.id);
        if (!row) return notFound(res, 'Factura');
        success(res, row);
    } catch (error) {
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

const store = async (req, res) => {
    try {
        const { pedido_id, numero_factura } = req.body;
        if (!pedido_id || !numero_factura) return badRequest(res, 'ID del pedido y numero de factura son obligatorios');
        const id = await Factura.create(req.body);
        success(res, { id_factura: id }, 'Factura generada con éxito', 201);
    } catch (error) {
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

const update = async (req, res) => {
    try {
        const { id } = req.params;
        const actualizado = await Factura.update(id, req.body);
        if (!actualizado) return notFound(res, 'Factura');
        success(res, null, 'Factura actualizada');
    } catch (error) {
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

const destroy = async (req, res) => {
    try {
        const { id } = req.params;
        const eliminado = await Factura.delete(id);
        if (!eliminado) return notFound(res, 'Factura');
        success(res, null, 'Factura eliminada');
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return badRequest(res, 'No se puede eliminar esta factura porque tiene detalles asociados.');
        }
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

export default { getAll, getOne, store, update, destroy };