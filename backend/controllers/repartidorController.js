/**
 * @file repartidorController.js
 * @description Controlador para la gestión de repartidores y asignación de pedidos.
 */
import Repartidor from '../models/repartidorModel.js';
import { success, error as responseError, notFound, badRequest, unauthorized, forbidden, conflict } from '../utils/responseHelper.js';

const repartidorController = {
    getAll: async (req, res) => {
        try {
            const repartidores = await Repartidor.findAll();
            success(res, repartidores);
        } catch (error) {
            responseError(res, 'SERVER_ERROR', error.message);
        }
    },

    getById: async (req, res) => {
        try {
            const repartidor = await Repartidor.findById(req.params.id);
            if (!repartidor) return notFound(res, 'Repartidor');
            success(res, repartidor);
        } catch (error) {
            responseError(res, 'SERVER_ERROR', error.message);
        }
    },

    toggleActivo: async (req, res) => {
        try {
            const { activo } = req.body;
            await Repartidor.toggleActivo(req.params.id, activo);
            success(res, null, 'Estado del repartidor actualizado exitosamente');
        } catch (error) {
            responseError(res, 'SERVER_ERROR', error.message);
        }
    },

    asignarPedido: async (req, res) => {
        try {
            const { pedido_id } = req.body;
            await Repartidor.asignarPedido(pedido_id, req.params.id);
            success(res, null, 'Pedido asignado exitosamente al repartidor');
        } catch (error) {
            if (error.message === 'El pedido ya fue asignado a otro repartidor') {
                return conflict(res, error.message);
            }
            responseError(res, 'SERVER_ERROR', error.message);
        }
    },

    desasignarPedido: async (req, res) => {
        try {
            await Repartidor.desasignarPedido(req.params.pedidoId);
            success(res, null, 'Pedido desasignado exitosamente');
        } catch (error) {
            responseError(res, 'SERVER_ERROR', error.message);
        }
    },

    cambiarEstadoPedido: async (req, res) => {
        try {
            const { estado, notas } = req.body;
            const usuario_id = req.usuario?.userId; // Asumiendo que el middleware verificarToken añade req.usuario
            await Repartidor.cambiarEstadoPedido(req.params.pedidoId, estado, usuario_id, notas);
            success(res, null, 'Estado del pedido actualizado exitosamente');
        } catch (error) {
            responseError(res, 'SERVER_ERROR', error.message);
        }
    },

    getPedidosSinAsignar: async (req, res) => {
        try {
            const pedidos = await Repartidor.getPedidosSinAsignar();
            success(res, pedidos);
        } catch (error) {
            responseError(res, 'SERVER_ERROR', error.message);
        }
    }
};

export default repartidorController;
