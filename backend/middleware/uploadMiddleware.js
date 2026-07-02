/**
 * @file uploadMiddleware.js
 * @description Middleware para la gestión de subida de archivos (imágenes) a Cloudinary.
 * Usa memoryStorage + Cloudinary SDK directo (compatible con multer v2).
 */
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

// ── Configurar Cloudinary con las credenciales del .env ──────
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Filtro de seguridad: solo imágenes ──────────────────────
const fileFilter = (req, file, cb) => {
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (tiposPermitidos.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten imágenes (JPG, PNG, WEBP)'), false);
    }
};

const comprobanteFileFilter = (req, file, cb) => {
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/jpg'];
    if (tiposPermitidos.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten imágenes de comprobante (JPG, PNG)'), false);
    }
};

// ── Helper: subir buffer a Cloudinary ────────────────────────
export const uploadToCloudinary = (buffer, folder, options = {}) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder, ...options },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        stream.end(buffer);
    });
};

// ── Instancia de Multer con memoryStorage ────────────────────
export const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // Máximo 5MB
});

export const uploadComprobante = multer({
    storage: multer.memoryStorage(),
    fileFilter: comprobanteFileFilter,
    limits: { fileSize: 3 * 1024 * 1024 }, // Máximo 3MB
});
