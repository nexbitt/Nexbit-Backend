import prisma from '../config/prisma.js';
import { success, error as responseError, notFound, badRequest, unauthorized, forbidden, conflict } from '../utils/responseHelper.js';

const bancosController = {
    listar: async (req, res) => {
        try {
            const cuentas = await prisma.configuracion_bancaria.findMany({
                where: { activo: true },
                orderBy: { banco: 'asc' }
            });
            success(res, cuentas);
        } catch (error) {
            console.error('Error listar cuentas bancarias:', error);
            responseError(res, 'SERVER_ERROR', error.message);
        }
    }
};

export default bancosController;
