import prisma from '../config/prisma.js';

const bancosController = {
    listar: async (req, res) => {
        try {
            const cuentas = await prisma.configuracion_bancaria.findMany({
                where: { activo: true },
                orderBy: { banco: 'asc' }
            });
            res.json(cuentas);
        } catch (error) {
            console.error('Error listar cuentas bancarias:', error);
            res.status(500).json({ message: error.message });
        }
    }
};

export default bancosController;
