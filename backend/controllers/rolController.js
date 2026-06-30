/**
 * @file rolController.js
 * @description Controlador para la gestión de roles de usuario.
 */
import Rol from '../models/rolModel.js';
import { success, error as responseError, notFound, badRequest, unauthorized, forbidden, conflict } from '../utils/responseHelper.js';

const getAll = async (req, res) => {
    try {
        const data = await Rol.findAll();
        success(res, data);
    } catch (error) {
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

const getOne = async (req, res) => {
    try {
        const row = await Rol.findById(req.params.id);
        if (!row) return notFound(res, 'Rol');
        success(res, row);
    } catch (error) {
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

const store = async (req, res) => {
    try {
        const { nombre, descripcion } = req.body;
        if (!nombre) return badRequest(res, 'El nombre es obligatorio');
        const id = await Rol.create({ nombre, descripcion });
        success(res, { id_rol: id }, 'Rol creado con éxito', 201);
    } catch (error) {
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

const update = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion } = req.body;

        if (!nombre) return badRequest(res, 'El nombre es obligatorio');

        const actualizado = await Rol.update(id, { nombre, descripcion });
        if (!actualizado) return notFound(res, 'Rol');
        success(res, null, 'Rol actualizado');
    } catch (error) {
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

export default { getAll, getOne, store, update };