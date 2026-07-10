-- RedefineIndex
CREATE INDEX `fk_mov_user` ON `movimientos_inventario`(`usuario_id`);
DROP INDEX `fk_mov_usuario` ON `movimientos_inventario`;
