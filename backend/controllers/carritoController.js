/**
 * @file carritoController.js
 * @description Controlador para gestionar el carrito de compras.
 */
import Carrito from '../models/carritoModel.js';
import { success, error as responseError, notFound, badRequest, unauthorized, forbidden, conflict } from '../utils/responseHelper.js';

const getCart = async (req, res) => {
    try {
        const { usuario_id, session_id } = req.query;
        const items = await Carrito.find(usuario_id, session_id);
        success(res, items);
    } catch (error) {
        console.error("Error al obtener carrito:", error);
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

const add = async (req, res) => {
    try {
        const { usuario_id, session_id, producto_id, cantidad } = req.body;
        if (!producto_id || !cantidad) {
            return badRequest(res, 'Producto y cantidad obligatorios');
        }
        await Carrito.addItem(usuario_id, session_id, producto_id, cantidad);
        const cart = await Carrito.find(usuario_id, session_id);
        success(res, cart);
    } catch (error) {
        console.error("Error al agregar item:", error);
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

const update = async (req, res) => {
    try {
        const { id_carrito } = req.params;
        const { cantidad, usuario_id, session_id } = req.body;
        await Carrito.updateQuantity(id_carrito, cantidad);
        const cart = await Carrito.find(usuario_id, session_id);
        success(res, cart);
    } catch (error) {
        console.error("Error al actualizar item:", error);
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

const remove = async (req, res) => {
    try {
        const { producto_id } = req.params;
        const { usuario_id, session_id } = req.query;
        await Carrito.removeItemByProducto(usuario_id, session_id, producto_id);
        const cart = await Carrito.find(usuario_id, session_id);
        success(res, cart);
    } catch (error) {
        console.error("Error al eliminar item:", error);
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

const clear = async (req, res) => {
    try {
        const { usuario_id, session_id } = req.body;
        await Carrito.clearCart(usuario_id, session_id);
        success(res, []);
    } catch (error) {
        console.error("Error al vaciar carrito:", error);
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

const merge = async (req, res) => {
    try {
        const { session_id, usuario_id } = req.body;
        if (session_id && usuario_id) {
            await Carrito.mergeSession(session_id, usuario_id);
        }
        const cart = await Carrito.find(usuario_id, session_id);
        success(res, cart);
    } catch(error) {
        console.error("Error al fusionar:", error);
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

// Exportamos todas las funciones como un objeto por defecto
export default {
    getCart,
    add,
    update,
    remove,
    clear,
    merge
};