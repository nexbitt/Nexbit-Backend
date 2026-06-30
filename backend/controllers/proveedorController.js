/**
 * @file proveedorController.js
 * @description Controlador para la gestión de proveedores.
 */
import Proveedor from '../models/proveedorModel.js';
import { success, error as responseError, notFound, badRequest, unauthorized, forbidden, conflict } from '../utils/responseHelper.js';

const getAll = async (req, res) => {
    try {
        const data = await Proveedor.findAll();
        success(res, data);
    } catch (error) {
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

const getOne = async (req, res) => {
    try {
        const row = await Proveedor.findById(req.params.id);
        if (!row) return notFound(res, 'Proveedor');
        success(res, row);
    } catch (error) {
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

const store = async (req, res) => {
    try {
        const { nit, nombre, telefono, correo, direccion } = req.body;
        if (!nit || !nombre) return badRequest(res, 'NIT y Nombre son obligatorios');
        const sanitizedNombre = nombre.trim();
        if (sanitizedNombre.length < 3) return badRequest(res, 'El nombre debe tener al menos 3 caracteres');
        const id = await Proveedor.create({ nit: nit.trim(), nombre: sanitizedNombre, telefono: telefono?.trim(), correo: correo?.trim(), direccion: direccion?.trim() });
        success(res, { id_proveedor: id }, 'Proveedor creado con éxito', 201);
    } catch (error) {
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

const update = async (req, res) => {
    try {
        const { id } = req.params;
        const data = { ...req.body };
        if (data.nombre) {
            data.nombre = data.nombre.trim();
            if (data.nombre.length < 3) return badRequest(res, 'El nombre debe tener al menos 3 caracteres');
        }
        if (data.nit) data.nit = data.nit.trim();
        if (data.telefono) data.telefono = data.telefono.trim();
        if (data.correo) data.correo = data.correo.trim();
        if (data.direccion) data.direccion = data.direccion.trim();
        const actualizado = await Proveedor.update(id, data);
        if (!actualizado) return notFound(res, 'Proveedor');
        success(res, null, 'Proveedor actualizado correctamente');
    } catch (error) {
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

const destroy = async (req, res) => {
    try {
        const { id } = req.params;
        const eliminado = await Proveedor.delete(id);
        if (!eliminado) return notFound(res, 'Proveedor');
        success(res, null, 'Proveedor eliminado');
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return badRequest(res, 'No se puede eliminar este proveedor porque tiene registros asociados.');
        }
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

export default { getAll, getOne, store, update, destroy };