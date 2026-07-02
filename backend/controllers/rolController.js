/**
 * @file rolController.js
 * @description Controlador para la gestión de roles de usuario.
 */
import prisma from '../config/prisma.js';

const getAll = async (req, res) => {
    try {
        const data = await prisma.roles.findMany({ orderBy: { id_rol: 'asc' } });
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getOne = async (req, res) => {
    try {
        const row = await prisma.roles.findUnique({ where: { id_rol: Number(req.params.id) } });
        if (!row) return res.status(404).json({ message: "Rol no encontrado" });
        res.json(row);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const store = async (req, res) => {
    try {
        const { nombre, descripcion } = req.body;
        if (!nombre) return res.status(400).json({ message: "El nombre es obligatorio" });
        const result = await prisma.roles.create({ data: { nombre, descripcion } });
        res.status(201).json({ message: "Rol creado con éxito", id_rol: result.id_rol });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const update = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion } = req.body;

        if (!nombre) return res.status(400).json({ message: "El nombre es obligatorio" });

        const result = await prisma.roles.updateMany({ where: { id_rol: Number(id) }, data: { nombre, descripcion } });
        if (!result.count) return res.status(404).json({ message: "Rol no encontrado" });
        res.json({ message: "Rol actualizado" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export default { getAll, getOne, store, update };