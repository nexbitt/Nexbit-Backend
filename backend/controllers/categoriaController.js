/**
 * @file categoriaController.js
 * @description Controlador para la gestión de categorías de productos.
 */
import prisma from '../config/prisma.js';

// Parsear atributos desde descripción JSON
const parsearAtributos = (descripcion) => {
    if (!descripcion) return { texto: '', atributos: [] };
    try {
        const parsed = JSON.parse(descripcion);
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.atributos)) {
            return parsed;
        }
    } catch { /* no es JSON, es texto plano */ }
    return { texto: descripcion, atributos: [] };
};

const getAll = async (req, res) => {
    try {
        const data = await prisma.categorias.findMany({ orderBy: { id_categoria: 'asc' } });
        const enriched = data.map(c => ({
            ...c,
            ...parsearAtributos(c.descripcion),
            descripcion_texto: parsearAtributos(c.descripcion).texto
        }));
        res.json(enriched);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getOne = async (req, res) => {
    try {
        const row = await prisma.categorias.findUnique({ where: { id_categoria: Number(req.params.id) } });
        if (!row) return res.status(404).json({ message: "Categoría no encontrada" });
        res.json({ ...row, ...parsearAtributos(row.descripcion), descripcion_texto: parsearAtributos(row.descripcion).texto });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const store = async (req, res) => {
    try {
        const { nombre, descripcion, atributos } = req.body;
        if (!nombre) return res.status(400).json({ message: "Faltan campos obligatorios" });
        const sanitizedNombre = nombre.trim();
        if (sanitizedNombre.length < 3) return res.status(400).json({ message: "El nombre debe tener al menos 3 caracteres" });

        // Si se enviaron atributos, guardar como JSON en descripción
        let descripcionFinal = descripcion?.trim() || '';
        if (atributos && Array.isArray(atributos) && atributos.length > 0) {
            descripcionFinal = JSON.stringify({ texto: descripcionFinal, atributos });
        }

        const result = await prisma.categorias.create({ data: { nombre: sanitizedNombre, descripcion: descripcionFinal } });
        res.status(201).json({ message: "Categoría creada con éxito", id_categoria: result.id_categoria });
    } catch (error) {
        res.status(500).json({ message: error.message });
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

        // Si se enviaron atributos, guardar como JSON en descripción
        if (data.atributos && Array.isArray(data.atributos)) {
            const textoDesc = data.descripcion?.trim() || '';
            data.descripcion = JSON.stringify({ texto: textoDesc, atributos: data.atributos });
            delete data.atributos;
        } else if (data.descripcion) {
            data.descripcion = data.descripcion.trim();
        }

        const result = await prisma.categorias.updateMany({ where: { id_categoria: Number(id) }, data });
        if (!result.count) return res.status(404).json({ message: "Categoría no encontrada para actualizar" });
        res.json({ message: "Categoría actualizada correctamente" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const destroy = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await prisma.categorias.deleteMany({ where: { id_categoria: Number(id) } });
        if (!result.count) return res.status(404).json({ message: "Categoría no encontrada" });
        res.json({ message: "Categoría eliminada" });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ error: "No se puede eliminar esta categoría porque existen productos asociados a ella." });
        }
        res.status(500).json({ message: error.message });
    }
};

export default { getAll, getOne, store, update, destroy };