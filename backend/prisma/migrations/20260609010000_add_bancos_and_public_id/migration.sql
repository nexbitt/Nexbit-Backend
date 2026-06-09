-- CreateTable configuracion_bancaria
CREATE TABLE IF NOT EXISTS `configuracion_bancaria` (
    `id_configuracion` INTEGER NOT NULL AUTO_INCREMENT,
    `banco` VARCHAR(100) NOT NULL,
    `tipo_cuenta` VARCHAR(50) NOT NULL,
    `numero_cuenta` VARCHAR(50) NOT NULL,
    `titular` VARCHAR(150) NOT NULL,
    `documento` VARCHAR(30) NULL,
    `descripcion` VARCHAR(255) NULL,
    `activo` BOOLEAN NULL DEFAULT true,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id_configuracion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable pedidos add new columns
ALTER TABLE `pedidos` ADD COLUMN IF NOT EXISTS `nota_admin` VARCHAR(500) NULL AFTER `comprobante_pago_url`;
ALTER TABLE `pedidos` ADD COLUMN IF NOT EXISTS `comprobante_pago_public_id` VARCHAR(255) NULL AFTER `comprobante_pago_url`;
