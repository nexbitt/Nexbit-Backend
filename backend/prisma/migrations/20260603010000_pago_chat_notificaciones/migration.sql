-- Add DISPONIBLE to pedidos_estado enum
ALTER TABLE pedidos MODIFY COLUMN estado ENUM('PENDIENTE','CONFIRMADO','EN_REVISION','APROBADO','RECHAZADO','ASIGNADO','EN_CAMINO','ENTREGADO','CANCELADO','DISPONIBLE') DEFAULT 'PENDIENTE';

-- Create tipo_notificacion enum
CREATE TABLE `tipo_notificacion` (
  `tipo_notificacion` VARCHAR(50) NOT NULL PRIMARY KEY
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `tipo_notificacion` (`tipo_notificacion`) VALUES
('NUEVO_PEDIDO'),
('COMPROBANTE_SUBIDO'),
('PAGO_APROBADO'),
('PAGO_RECHAZADO'),
('NUEVO_MENSAJE'),
('PEDIDO_ASIGNADO');

-- Create conversaciones table
CREATE TABLE `conversaciones` (
  `id_conversacion` INT NOT NULL AUTO_INCREMENT,
  `pedido_id` INT NOT NULL,
  `usuario_id` INT NOT NULL,
  `admin_id` INT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_conversacion`),
  UNIQUE KEY `conversaciones_pedido_id_key` (`pedido_id`),
  KEY `fk_conv_pedido` (`pedido_id`),
  KEY `fk_conv_usuario` (`usuario_id`),
  KEY `fk_conv_admin` (`admin_id`),
  CONSTRAINT `fk_conv_pedido` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id_pedido`) ON DELETE CASCADE,
  CONSTRAINT `fk_conv_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_conv_admin` FOREIGN KEY (`admin_id`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create mensajes table
CREATE TABLE `mensajes` (
  `id_mensaje` INT NOT NULL AUTO_INCREMENT,
  `conversacion_id` INT NOT NULL,
  `remitente_id` INT NOT NULL,
  `mensaje` TEXT NOT NULL,
  `leido` TINYINT NOT NULL DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_mensaje`),
  KEY `fk_msg_conv` (`conversacion_id`),
  KEY `fk_msg_remitente` (`remitente_id`),
  CONSTRAINT `fk_msg_conv` FOREIGN KEY (`conversacion_id`) REFERENCES `conversaciones` (`id_conversacion`) ON DELETE CASCADE,
  CONSTRAINT `fk_msg_remitente` FOREIGN KEY (`remitente_id`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create notificaciones table
CREATE TABLE `notificaciones` (
  `id_notificacion` INT NOT NULL AUTO_INCREMENT,
  `usuario_id` INT NOT NULL,
  `tipo` VARCHAR(50) NOT NULL,
  `titulo` VARCHAR(200) NOT NULL,
  `mensaje` TEXT,
  `pedido_id` INT DEFAULT NULL,
  `leido` TINYINT NOT NULL DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_notificacion`),
  KEY `fk_notif_usuario` (`usuario_id`),
  KEY `idx_notif_leido` (`leido`),
  CONSTRAINT `fk_notif_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
