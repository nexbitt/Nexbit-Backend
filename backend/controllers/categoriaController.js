/**
 * @file categoriaController.js
 * @description Controlador para la gestión de categorías de productos.
 */
import Categoria from '../models/categoriaModel.js';

const getAll = async (req, res) => {
    try {
        const data = await Categoria.findAll();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getOne = async (req, res) => {
    try {
        const row = await Categoria.findById(req.params.id);
        if (!row) return res.status(404).json({ message: "Categoría no encontrada" });
        res.json(row);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const store = async (req, res) => {
    try {
        const { nombre, descripcion } = req.body;
        if (!nombre) return res.status(400).json({ message: "Faltan campos obligatorios" });
        const sanitizedNombre = nombre.trim();
        if (sanitizedNombre.length < 3) return res.status(400).json({ message: "El nombre debe tener al menos 3 caracteres" });
        const id = await Categoria.create({ nombre: sanitizedNombre, descripcion: descripcion?.trim() });
        res.status(201).json({ message: "Categoría creada con éxito", id_categoria: id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const update = async (req, res) => {
    try {
        const { id } = req.params;
        const data = { ...req.body };
        if (data.nombre) {
            data.nombre = data.nombre.trim();
            if (data.nombre.length < 3) return res.status(400).json({ message: "El nombre debe tener al menos 3 caracteres" });
        }
        if (data.descripcion) data.descripcion = data.descripcion.trim();
        const actualizado = await Categoria.update(id, data);
        if (!actualizado) return res.status(404).json({ message: "Categoría no encontrada para actualizar" });
        res.json({ message: "Categoría actualizada correctamente" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const destroy = async (req, res) => {
    try {
        const { id } = req.params;
        const eliminado = await Categoria.delete(id);
        if (!eliminado) return res.status(404).json({ message: "Categoría no encontrada" });
        res.json({ message: "Categoría eliminada" });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ error: "No se puede eliminar esta categoría porque existen productos asociados a ella." });
        }
        res.status(500).json({ error: error.message });
    }
};

export default { getAll, getOne, store, update, destroy };