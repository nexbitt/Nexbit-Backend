/**
 * @file categoriaController.js
 * @description Controlador para la gestión de categorías de productos.
 */
import Categoria from '../models/categoriaModel.js';
import { success, error as responseError, notFound, badRequest, unauthorized, forbidden, conflict } from '../utils/responseHelper.js';

const getAll = async (req, res) => {
    try {
        const data = await Categoria.findAll();
        success(res, data);
    } catch (error) {
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

const getOne = async (req, res) => {
    try {
        const row = await Categoria.findById(req.params.id);
        if (!row) return notFound(res, 'Categoría');
        success(res, row);
    } catch (error) {
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

const store = async (req, res) => {
    try {
        const { nombre, descripcion } = req.body;
        if (!nombre) return badRequest(res, 'Faltan campos obligatorios');
        const sanitizedNombre = nombre.trim();
        if (sanitizedNombre.length < 3) return badRequest(res, 'El nombre debe tener al menos 3 caracteres');
        const id = await Categoria.create({ nombre: sanitizedNombre, descripcion: descripcion?.trim() });
        success(res, { id_categoria: id }, 'Categoría creada con éxito', 201);
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
        if (data.descripcion) data.descripcion = data.descripcion.trim();
        const actualizado = await Categoria.update(id, data);
        if (!actualizado) return notFound(res, 'Categoría');
        success(res, null, 'Categoría actualizada correctamente');
    } catch (error) {
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

const destroy = async (req, res) => {
    try {
        const { id } = req.params;
        const eliminado = await Categoria.delete(id);
        if (!eliminado) return notFound(res, 'Categoría');
        success(res, null, 'Categoría eliminada');
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return badRequest(res, 'No se puede eliminar esta categoría porque existen productos asociados a ella.');
        }
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

export default { getAll, getOne, store, update, destroy };