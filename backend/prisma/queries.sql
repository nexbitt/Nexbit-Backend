-- =====================================================
-- ARCHIVO: queries.sql
-- DESCRIPCIÓN: Reportes de Facturación, Inventario y Seguridad
-- BASE DE DATOS: sistema_comercial
-- =====================================================

USE sistema_comercial;

-- =====================================================
-- 1. REPORTE DE VENTAS Y FACTURACIÓN DETALLADA
-- =====================================================
SELECT 
    f.numero_factura                                AS Factura_No,
    DATE_FORMAT(f.fecha_emision, '%d/%m/%Y')        AS Fecha_Venta,
    IFNULL(u.nombre, 'Cliente Eliminado')           AS Cliente,
    IFNULL(u.numero_documento, '—')                 AS Documento,
    IFNULL(cat.nombre, 'Sin Categoría')              AS Categoria,
    IFNULL(p.nombre, 'Producto Eliminado')          AS Producto,
    IFNULL(dp.cantidad, 0)                          AS Cant,
    IFNULL(dp.precio_unitario, 0)                   AS Precio_Venta_COP,
    IFNULL(dp.subtotal, 0)                          AS Subtotal_Item,
    IFNULL(ped.subtotal, 0)                         AS Subtotal_Pedido,
    IFNULL(ped.impuesto, 0)                         AS IVA,
    f.total                                         AS Total_Factura,
    f.estado                                        AS Estado_Pago,
    IFNULL(rep.nombre, 'Sin asignar')               AS Repartidor
FROM facturas f
LEFT JOIN pedidos ped        ON f.pedido_id       = ped.id_pedido
LEFT JOIN usuarios u         ON ped.usuario_id    = u.id_usuario
LEFT JOIN usuarios rep       ON ped.repartidor_id = rep.id_usuario
LEFT JOIN detalle_pedido dp  ON ped.id_pedido     = dp.pedido_id
LEFT JOIN productos p        ON dp.producto_id    = p.id_producto
LEFT JOIN categorias cat     ON p.categoria_id    = cat.id_categoria
WHERE f.estado != 'ANULADA'
ORDER BY f.fecha_emision DESC;

-- =====================================================
-- 2. REPORTE DE INVENTARIO, STOCK Y GANANCIAS
-- =====================================================
SELECT 
    p.id_producto                                               AS ID,
    p.nombre                                                    AS Producto,
    c.nombre                                                    AS Categoria,
    IFNULL(prov.nombre, 'SIN PROVEEDOR')                        AS Proveedor,
    p.stock_actual                                              AS Stock_Disponible,
    p.stock_minimo                                              AS Stock_Min,
    CASE 
        WHEN p.stock_actual = 0               THEN 'AGOTADO'
        WHEN p.stock_actual <= p.stock_minimo THEN 'STOCK BAJO'
        ELSE                                       'OK'
    END                                                         AS Alerta_Stock,
    p.precio_compra                                             AS Costo_Unit_COP,
    p.precio_venta                                              AS PVP_COP,
    (p.precio_venta - p.precio_compra)                          AS Margen_Ganancia,
    ROUND(((p.precio_venta - p.precio_compra) / p.precio_compra) * 100, 2) AS Margen_Pct,
    (p.stock_actual * p.precio_compra)                          AS Valor_Inventario_Costo,
    (p.stock_actual * (p.precio_venta - p.precio_compra))       AS Ganancia_Potencial
FROM productos p
INNER JOIN categorias c      ON p.categoria_id  = c.id_categoria
LEFT  JOIN proveedores prov  ON p.proveedor_id  = prov.id_proveedor
WHERE p.activo = TRUE
ORDER BY p.stock_actual ASC, Margen_Ganancia DESC;

-- =====================================================
-- 3. REPORTE DE SEGURIDAD, ROLES Y ACCESOS
-- =====================================================
SELECT 
    u.id_usuario                                        AS ID_User,
    u.nombre                                            AS Nombre_Usuario,
    u.email                                             AS Email_Login,
    IFNULL(u.telefono, '—')                             AS Telefono,
    IFNULL(r.nombre, 'SIN ROL ASIGNADO')                AS Rol,
    IFNULL(r.descripcion, 'Cuenta en estado crítico')   AS Permisos_Asignados,
    CASE 
        WHEN u.activo = TRUE THEN 'ACTIVO' 
        ELSE 'INACTIVO' 
    END                                                 AS Estado_Cuenta,
    DATE_FORMAT(u.created_at, '%d/%m/%Y %H:%i')         AS Fecha_Registro,
    DATE_FORMAT(u.updated_at, '%d/%m/%Y %H:%i')         AS Ultima_Modificacion
FROM usuarios u
LEFT JOIN roles r ON u.rol_id = r.id_rol
ORDER BY r.nombre ASC, u.activo DESC;

-- =====================================================
-- 4. ESTADO ACTUAL DE CARRITOS
-- =====================================================
SELECT 
    IFNULL(u.nombre, 'Invitado')            AS Usuario,
    IFNULL(car.session_id, '—')             AS Session_ID,
    p.nombre                                AS Producto,
    car.cantidad                            AS Cant_En_Carrito,
    p.precio_venta                          AS Precio_Actual,
    (car.cantidad * p.precio_venta)         AS Total_Proyectado,
    CASE
        WHEN p.stock_actual = 0             THEN 'SIN STOCK'
        WHEN p.stock_actual < car.cantidad  THEN 'STOCK INSUFICIENTE'
        ELSE                                     'DISPONIBLE'
    END                                     AS Disponibilidad
FROM carrito car
LEFT  JOIN usuarios u  ON car.usuario_id  = u.id_usuario
INNER JOIN productos p ON car.producto_id = p.id_producto
ORDER BY u.nombre ASC;

-- =====================================================
-- 5. REPORTE DE REPARTIDORES Y SUS PEDIDOS
-- =====================================================
SELECT 
    rep.id_usuario                                          AS ID_Repartidor,
    rep.nombre                                              AS Repartidor,
    IFNULL(rep.telefono, '—')                               AS Telefono,
    IFNULL(ped.id_pedido, '—')                              AS ID_Pedido,
    IFNULL(u.nombre, '—')                                   AS Cliente,
    IFNULL(ped.direccion_entrega, '—')                      AS Direccion_Entrega,
    IFNULL(ped.estado, 'SIN ASIGNACIONES')                  AS Estado_Pedido,
    IFNULL(DATE_FORMAT(ped.fecha_asignacion, '%d/%m/%Y %H:%i'), '—') AS Fecha_Asignacion,
    IFNULL(DATE_FORMAT(ped.fecha_entrega_est, '%d/%m/%Y %H:%i'), '—') AS Entrega_Estimada,
    IFNULL(DATE_FORMAT(ped.fecha_entrega_real, '%d/%m/%Y %H:%i'), '—') AS Entrega_Real,
    CASE
        WHEN ped.id_pedido IS NULL THEN 'SIN TRABAJO'
        WHEN ped.fecha_entrega_real IS NULL THEN 'PENDIENTE'
        WHEN ped.fecha_entrega_real <= ped.fecha_entrega_est THEN 'A TIEMPO'
        ELSE 'TARDE'
    END                                                     AS Cumplimiento,
    IFNULL(ped.total, 0)                                    AS Total_Pedido,
    IFNULL(GROUP_CONCAT(p.nombre, ' x', dp.cantidad ORDER BY p.nombre SEPARATOR ' | '), 'Sin productos') AS Productos
FROM usuarios rep
INNER JOIN roles r           ON rep.rol_id = r.id_rol AND r.nombre = 'Repartidor'
LEFT JOIN pedidos ped        ON ped.repartidor_id = rep.id_usuario
LEFT JOIN usuarios u         ON ped.usuario_id = u.id_usuario
LEFT JOIN detalle_pedido dp  ON ped.id_pedido = dp.pedido_id
LEFT JOIN productos p        ON dp.producto_id = p.id_producto
GROUP BY 
    rep.id_usuario, rep.nombre, rep.telefono,
    ped.id_pedido, u.nombre, ped.direccion_entrega,
    ped.estado, ped.fecha_asignacion,
    ped.fecha_entrega_est, ped.fecha_entrega_real, ped.total
ORDER BY rep.nombre ASC, ped.fecha_asignacion DESC;
