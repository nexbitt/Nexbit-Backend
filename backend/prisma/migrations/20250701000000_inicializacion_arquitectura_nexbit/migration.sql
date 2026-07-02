-- CreateTable
CREATE TABLE `roles` (
    `id_rol` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(50) NOT NULL,
    `descripcion` VARCHAR(255) NULL,

    UNIQUE INDEX `nombre`(`nombre`),
    PRIMARY KEY (`id_rol`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuarios` (
    `id_usuario` INTEGER NOT NULL AUTO_INCREMENT,
    `rol_id` INTEGER NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `tipo_documento` VARCHAR(20) NULL,
    `numero_documento` VARCHAR(20) NULL,
    `telefono` VARCHAR(20) NULL,
    `direccion` VARCHAR(255) NULL,
    `activo` BOOLEAN NULL DEFAULT true,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `email`(`email`),
    INDEX `fk_usuario_rol`(`rol_id`),
    PRIMARY KEY (`id_usuario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categorias` (
    `id_categoria` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `descripcion` VARCHAR(255) NULL,

    UNIQUE INDEX `nombre`(`nombre`),
    PRIMARY KEY (`id_categoria`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `proveedores` (
    `id_proveedor` INTEGER NOT NULL AUTO_INCREMENT,
    `nit` VARCHAR(20) NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `telefono` VARCHAR(20) NULL,
    `correo` VARCHAR(100) NULL,
    `direccion` VARCHAR(255) NULL,
    `activo` BOOLEAN NULL DEFAULT true,

    UNIQUE INDEX `nit`(`nit`),
    PRIMARY KEY (`id_proveedor`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `productos` (
    `id_producto` INTEGER NOT NULL AUTO_INCREMENT,
    `categoria_id` INTEGER NULL,
    `proveedor_id` INTEGER NULL,
    `nombre` VARCHAR(150) NOT NULL,
    `descripcion` TEXT NULL,
    `imagen_url` VARCHAR(500) NULL,
    `precio_compra` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `precio_venta` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `stock_actual` INTEGER NULL DEFAULT 0,
    `stock_minimo` INTEGER NULL DEFAULT 0,
    `activo` BOOLEAN NULL DEFAULT true,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `fk_prod_cat`(`categoria_id`),
    INDEX `fk_prod_prov`(`proveedor_id`),
    PRIMARY KEY (`id_producto`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `configuracion_bancaria` (
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

-- CreateTable
CREATE TABLE `pedidos` (
    `id_pedido` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `repartidor_id` INTEGER NULL,
    `subtotal` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `impuesto` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `total` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `estado` ENUM('PENDIENTE', 'CONFIRMADO', 'EN_REVISION', 'APROBADO', 'RECHAZADO', 'ASIGNADO', 'EN_CAMINO', 'ENTREGADO', 'CANCELADO', 'DISPONIBLE') NULL DEFAULT 'PENDIENTE',
    `status_pedido` VARCHAR(20) NULL DEFAULT 'activo',
    `direccion_entrega` VARCHAR(255) NULL,
    `notas_entrega` VARCHAR(500) NULL,
    `comprobante_pago_url` VARCHAR(500) NULL,
    `comprobante_pago_public_id` VARCHAR(255) NULL,
    `nota_admin` VARCHAR(500) NULL,
    `motivo_rechazo` VARCHAR(255) NULL,
    `simulado_por_admin` BOOLEAN NULL DEFAULT false,
    `admin_id_operador` INTEGER NULL,
    `auditoria_nota` VARCHAR(500) NULL,
    `fecha_pedido` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_asignacion` DATETIME(3) NULL,
    `fecha_entrega_est` DATETIME(3) NULL,
    `fecha_entrega_real` DATETIME(3) NULL,

    INDEX `fk_ped_user`(`usuario_id`),
    INDEX `fk_ped_repartidor`(`repartidor_id`),
    INDEX `fk_ped_admin_operador`(`admin_id_operador`),
    PRIMARY KEY (`id_pedido`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `detalle_pedido` (
    `id_detalle_pedido` INTEGER NOT NULL AUTO_INCREMENT,
    `pedido_id` INTEGER NOT NULL,
    `producto_id` INTEGER NOT NULL,
    `cantidad` INTEGER NOT NULL,
    `precio_unitario` DECIMAL(12, 2) NOT NULL,
    `subtotal` DECIMAL(12, 2) NOT NULL,

    INDEX `fk_det_pedido`(`pedido_id`),
    INDEX `fk_det_producto`(`producto_id`),
    PRIMARY KEY (`id_detalle_pedido`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `facturas` (
    `id_factura` INTEGER NOT NULL AUTO_INCREMENT,
    `pedido_id` INTEGER NOT NULL,
    `numero_factura` VARCHAR(50) NOT NULL,
    `subtotal` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `impuesto` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `total` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `estado` ENUM('EMITIDA', 'PAGADA', 'ANULADA') NULL DEFAULT 'EMITIDA',
    `fecha_emision` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `numero_factura`(`numero_factura`),
    INDEX `fk_fac_pedido`(`pedido_id`),
    PRIMARY KEY (`id_factura`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `carrito` (
    `id_carrito` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NULL,
    `session_id` VARCHAR(100) NULL,
    `producto_id` INTEGER NOT NULL,
    `cantidad` INTEGER NOT NULL DEFAULT 1,

    INDEX `fk_car_prod`(`producto_id`),
    INDEX `fk_car_user`(`usuario_id`),
    PRIMARY KEY (`id_carrito`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `movimientos_inventario` (
    `id_movimiento` INTEGER NOT NULL AUTO_INCREMENT,
    `producto_id` INTEGER NOT NULL,
    `usuario_id` INTEGER NOT NULL,
    `tipo_movimiento` ENUM('ENTRADA', 'SALIDA', 'AJUSTE', 'VENTA', 'COMPRA') NOT NULL,
    `cantidad` INTEGER NOT NULL DEFAULT 0,
    `referencia` VARCHAR(100) NULL,
    `fecha` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `fk_mov_producto`(`producto_id`),
    INDEX `fk_mov_usuario`(`usuario_id`),
    PRIMARY KEY (`id_movimiento`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `seguimiento_pedido` (
    `id_seguimiento` INTEGER NOT NULL AUTO_INCREMENT,
    `pedido_id` INTEGER NOT NULL,
    `estado_anterior` ENUM('PENDIENTE', 'CONFIRMADO', 'EN_REVISION', 'APROBADO', 'RECHAZADO', 'ASIGNADO', 'EN_CAMINO', 'ENTREGADO', 'CANCELADO') NULL,
    `estado_nuevo` ENUM('PENDIENTE', 'CONFIRMADO', 'EN_REVISION', 'APROBADO', 'RECHAZADO', 'ASIGNADO', 'EN_CAMINO', 'ENTREGADO', 'CANCELADO') NOT NULL,
    `cambiado_por` INTEGER NOT NULL,
    `notas` VARCHAR(500) NULL,
    `modificado_en_simulacion` BOOLEAN NULL DEFAULT false,
    `admin_id_operador` INTEGER NULL,
    `descripcion_cambio` VARCHAR(500) NULL,
    `fecha` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `fk_seg_pedido`(`pedido_id`),
    INDEX `fk_seg_usuario`(`cambiado_por`),
    INDEX `fk_seg_admin_operador`(`admin_id_operador`),
    PRIMARY KEY (`id_seguimiento`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conversaciones` (
    `id_conversacion` INTEGER NOT NULL AUTO_INCREMENT,
    `pedido_id` INTEGER NOT NULL,
    `usuario_id` INTEGER NOT NULL,
    `admin_id` INTEGER NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `conversaciones_pedido_id_key`(`pedido_id`),
    INDEX `fk_conv_pedido`(`pedido_id`),
    INDEX `fk_conv_usuario`(`usuario_id`),
    INDEX `fk_conv_admin`(`admin_id`),
    PRIMARY KEY (`id_conversacion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mensajes` (
    `id_mensaje` INTEGER NOT NULL AUTO_INCREMENT,
    `conversacion_id` INTEGER NOT NULL,
    `remitente_id` INTEGER NOT NULL,
    `mensaje` TEXT NOT NULL,
    `leido` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `fk_msg_conv`(`conversacion_id`),
    INDEX `fk_msg_remitente`(`remitente_id`),
    PRIMARY KEY (`id_mensaje`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `password_resets` (
    `id_reset` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `otp_hash` VARCHAR(255) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `fk_password_resets_usuario`(`usuario_id`),
    PRIMARY KEY (`id_reset`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notificaciones` (
    `id_notificacion` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `tipo` ENUM('NUEVO_PEDIDO', 'COMPROBANTE_SUBIDO', 'PAGO_APROBADO', 'PAGO_RECHAZADO', 'NUEVO_MENSAJE', 'PEDIDO_ASIGNADO', 'PEDIDO_ACEPTADO', 'PEDIDO_EN_CAMINO') NOT NULL,
    `titulo` VARCHAR(200) NOT NULL,
    `mensaje` TEXT NULL,
    `pedido_id` INTEGER NULL,
    `leido` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `fk_notif_usuario`(`usuario_id`),
    INDEX `idx_notif_leido`(`leido`),
    PRIMARY KEY (`id_notificacion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `usuarios` ADD CONSTRAINT `fk_usuario_rol` FOREIGN KEY (`rol_id`) REFERENCES `roles`(`id_rol`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productos` ADD CONSTRAINT `fk_prod_cat` FOREIGN KEY (`categoria_id`) REFERENCES `categorias`(`id_categoria`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productos` ADD CONSTRAINT `fk_prod_prov` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores`(`id_proveedor`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `pedidos` ADD CONSTRAINT `fk_ped_repartidor` FOREIGN KEY (`repartidor_id`) REFERENCES `usuarios`(`id_usuario`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `pedidos` ADD CONSTRAINT `fk_ped_user` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id_usuario`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `pedidos` ADD CONSTRAINT `fk_ped_admin_operador` FOREIGN KEY (`admin_id_operador`) REFERENCES `usuarios`(`id_usuario`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `detalle_pedido` ADD CONSTRAINT `fk_det_ped_id` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos`(`id_pedido`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `detalle_pedido` ADD CONSTRAINT `fk_det_ped_prod` FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id_producto`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `facturas` ADD CONSTRAINT `fk_fac_ped` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos`(`id_pedido`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `carrito` ADD CONSTRAINT `fk_car_prod` FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id_producto`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `carrito` ADD CONSTRAINT `fk_car_user` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id_usuario`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `movimientos_inventario` ADD CONSTRAINT `fk_mov_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id_producto`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `movimientos_inventario` ADD CONSTRAINT `fk_mov_user` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id_usuario`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `seguimiento_pedido` ADD CONSTRAINT `fk_seg_pedido` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos`(`id_pedido`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `seguimiento_pedido` ADD CONSTRAINT `fk_seg_usuario` FOREIGN KEY (`cambiado_por`) REFERENCES `usuarios`(`id_usuario`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `seguimiento_pedido` ADD CONSTRAINT `fk_seg_admin_operador` FOREIGN KEY (`admin_id_operador`) REFERENCES `usuarios`(`id_usuario`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `conversaciones` ADD CONSTRAINT `fk_conv_pedido` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos`(`id_pedido`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversaciones` ADD CONSTRAINT `fk_conv_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id_usuario`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `conversaciones` ADD CONSTRAINT `fk_conv_admin` FOREIGN KEY (`admin_id`) REFERENCES `usuarios`(`id_usuario`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `mensajes` ADD CONSTRAINT `fk_msg_conv` FOREIGN KEY (`conversacion_id`) REFERENCES `conversaciones`(`id_conversacion`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mensajes` ADD CONSTRAINT `fk_msg_remitente` FOREIGN KEY (`remitente_id`) REFERENCES `usuarios`(`id_usuario`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `password_resets` ADD CONSTRAINT `fk_password_resets_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notificaciones` ADD CONSTRAINT `fk_notif_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;
