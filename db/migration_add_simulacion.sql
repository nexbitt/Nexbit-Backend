-- =====================================================
-- MIGRACION: SIMULACION ABSOLUTA DE ROLES
-- =====================================================

-- 1. Tabla pedidos: columnas de trazabilidad de simulación
ALTER TABLE pedidos
  ADD COLUMN simulado_por_admin BOOLEAN DEFAULT FALSE AFTER motivo_rechazo,
  ADD COLUMN admin_id_operador INT NULL AFTER simulado_por_admin,
  ADD COLUMN auditoria_nota VARCHAR(500) NULL AFTER admin_id_operador,
  ADD CONSTRAINT fk_ped_admin_operador FOREIGN KEY (admin_id_operador) REFERENCES usuarios(id_usuario);

-- 2. Tabla seguimiento_pedido: columnas de trazabilidad de simulación
ALTER TABLE seguimiento_pedido
  ADD COLUMN modificado_en_simulacion BOOLEAN DEFAULT FALSE AFTER notas,
  ADD COLUMN admin_id_operador INT NULL AFTER modificado_en_simulacion,
  ADD COLUMN descripcion_cambio VARCHAR(500) NULL AFTER admin_id_operador,
  ADD CONSTRAINT fk_seg_admin_operador FOREIGN KEY (admin_id_operador) REFERENCES usuarios(id_usuario);
