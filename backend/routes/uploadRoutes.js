/**
 * @file uploadRoutes.js
 * @description Rutas para subida y eliminación genérica de archivos a Cloudinary.
 */
import express from 'express';
const router = express.Router();
import { v2 as cloudinary } from 'cloudinary';
import { upload } from '../middleware/uploadMiddleware.js';
import { verificarToken } from '../middleware/authMiddleware.js';

router.post('/cloudinary', verificarToken, upload.single('imagen'), (req, res) => {
    /*  #swagger.tags = ['Cargas']
        #swagger.summary = 'Subir archivo a Cloudinary'
        #swagger.description = 'Sube una imagen a Cloudinary y devuelve la URL segura.' */
    try {
        if (!req.file) return res.status(400).json({ message: 'No se envió ningún archivo' });
        res.json({
            url: req.file.path || req.file.secure_url || req.file.url,
            public_id: req.file.filename,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/cloudinary/:public_id', verificarToken, async (req, res) => {
    /*  #swagger.tags = ['Cargas']
        #swagger.summary = 'Eliminar archivo de Cloudinary'
        #swagger.description = 'Elimina una imagen previamente subida a Cloudinary usando su public_id.' */
    try {
        const result = await cloudinary.uploader.destroy(req.params.public_id);
        res.json({ message: 'Archivo eliminado', result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
