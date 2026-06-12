-- Create password_resets table for OTP-based password recovery
CREATE TABLE `password_resets` (
  `id_reset` INT NOT NULL AUTO_INCREMENT,
  `usuario_id` INT NOT NULL,
  `otp_hash` VARCHAR(255) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `verified` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_reset`),
  KEY `fk_password_resets_usuario` (`usuario_id`),
  CONSTRAINT `fk_password_resets_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
