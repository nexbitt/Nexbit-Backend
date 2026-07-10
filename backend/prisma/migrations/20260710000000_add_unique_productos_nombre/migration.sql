-- AlterTable: Add UNIQUE constraint on productos.nombre
ALTER TABLE `productos` ADD UNIQUE INDEX `productos_nombre`(`nombre`);
