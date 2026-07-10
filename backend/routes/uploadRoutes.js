/**
 * @file uploadRoutes.js
 * @description Rutas para subida y eliminación genérica de archivos a Cloudinary.
 */
import express from 'express';
const router = express.Router();
import { v2 as cloudinary } from 'cloudinary';
import { upload, uploadToCloudinary } from '../middleware/uploadMiddleware.js';
import { verificarToken } from '../middleware/authMiddleware.js';

router.post('/cloudinary', verificarToken, upload.single('imagen'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No se envió ningún archivo' });
        const result = await uploadToCloudinary(req.file.buffer, 'rematespaisa/productos', {
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
            transformation: [{ width: 800, height: 800, crop: 'limit' }, { quality: 'auto' }]
        });
        res.json({
            url: result.secure_url || result.url,
            public_id: result.public_id,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.delete('/cloudinary/:public_id', verificarToken, async (req, res) => {
    try {
        const result = await cloudinary.uploader.destroy(req.params.public_id);
        res.json({ message: 'Archivo eliminado', result });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
