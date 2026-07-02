/**
 * @file reportesController.js
 * @description Controlador con las 5 queries de reportes ejecutadas via Prisma $queryRawUnsafe.
 */
import prisma from '../config/prisma.js';

// ── 1. Ventas y Facturación ───────────────────────────────────────────────────
export const getVentas = async (req, res) => {
    try {
        const rows = await prisma.$queryRawUnsafe(`
            SELECT 
                f.numero_factura                                AS Factura_No,
                DATE_FORMAT(f.fecha_emision, '%d/%m/%Y')        AS Fecha_Venta,
                IFNULL(u.nombre, 'Cliente Eliminado')           AS Cliente,
                IFNULL(u.numero_documento, '\u2014')                 AS Documento,
                IFNULL(cat.nombre, 'Sin Categor\u00eda')              AS Categoria,
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
            ORDER BY f.fecha_emision DESC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ── 2. Inventario, Stock y Ganancias ─────────────────────────────────────────
export const getInventario = async (req, res) => {
    try {
        const rows = await prisma.$queryRawUnsafe(`
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
            ORDER BY p.stock_actual ASC, Margen_Ganancia DESC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ── 3. Seguridad, Roles y Accesos ─────────────────────────────────────────────
export const getSeguridad = async (req, res) => {
    try {
        const rows = await prisma.$queryRawUnsafe(`
            SELECT 
                u.id_usuario                                        AS ID_User,
                u.nombre                                            AS Nombre_Usuario,
                u.email                                             AS Email_Login,
                IFNULL(u.telefono, '\u2014')                             AS Telefono,
                IFNULL(r.nombre, 'SIN ROL ASIGNADO')                AS Rol,
                IFNULL(r.descripcion, 'Cuenta en estado cr\u00edtico')   AS Permisos_Asignados,
                CASE 
                    WHEN u.activo = TRUE THEN 'ACTIVO' 
                    ELSE 'INACTIVO' 
                END                                                 AS Estado_Cuenta,
                DATE_FORMAT(u.created_at, '%d/%m/%Y %H:%i')         AS Fecha_Registro,
                DATE_FORMAT(u.updated_at, '%d/%m/%Y %H:%i')         AS Ultima_Modificacion
            FROM usuarios u
            LEFT JOIN roles r ON u.rol_id = r.id_rol
            ORDER BY r.nombre ASC, u.activo DESC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ── 4. Carritos Activos ───────────────────────────────────────────────────────
export const getCarritos = async (req, res) => {
    try {
        const rows = await prisma.$queryRawUnsafe(`
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
            ORDER BY u.nombre ASC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ── 5. Repartidores y Pedidos ────────────────────────────────────────────────
export const getRepartidores = async (req, res) => {
    try {
        const rows = await prisma.$queryRawUnsafe(`
            SELECT 
                rep.id_usuario                                          AS ID_Repartidor,
                rep.nombre                                              AS Repartidor,
                IFNULL(rep.telefono, '\u2014')                               AS Telefono,
                IFNULL(ped.id_pedido, '\u2014')                              AS ID_Pedido,
                IFNULL(u.nombre, '\u2014')                                   AS Cliente,
                IFNULL(ped.direccion_entrega, '\u2014')                      AS Direccion_Entrega,
                IFNULL(ped.estado, 'SIN ASIGNACIONES')                  AS Estado_Pedido,
                IFNULL(DATE_FORMAT(ped.fecha_asignacion, '%d/%m/%Y %H:%i'), '\u2014') AS Fecha_Asignacion,
                IFNULL(DATE_FORMAT(ped.fecha_entrega_est, '%d/%m/%Y %H:%i'), '\u2014') AS Entrega_Estimada,
                IFNULL(DATE_FORMAT(ped.fecha_entrega_real, '%d/%m/%Y %H:%i'), '\u2014') AS Entrega_Real,
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
            ORDER BY rep.nombre ASC, ped.fecha_asignacion DESC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ── KPIs ────────────────────────────────────────────────────────────────────────
export const getVentasKpis = async (req, res) => {
    try {
        const rows = await prisma.$queryRawUnsafe(`
            SELECT
                COUNT(DISTINCT f.numero_factura) AS total_tickets,
                COALESCE(SUM(f.total), 0) AS total_ingresos,
                COALESCE(AVG(f.total), 0) AS promedio_ticket
            FROM facturas f
            WHERE f.estado != 'ANULADA'
        `);
        const [top] = await db.query(`
            SELECT p.nombre AS producto, SUM(dp.cantidad) AS total_uds
            FROM facturas f
            JOIN pedidos ped ON f.pedido_id = ped.id_pedido
            JOIN detalle_pedido dp ON ped.id_pedido = dp.pedido_id
            JOIN productos p ON dp.producto_id = p.id_producto
            WHERE f.estado != 'ANULADA'
            GROUP BY p.nombre
            ORDER BY total_uds DESC
            LIMIT 6
        `);
        res.json({ ...rows[0], top_productos: top });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getInventarioKpis = async (req, res) => {
    try {
        const rows = await prisma.$queryRawUnsafe(`
            SELECT
                COUNT(*) AS total_productos,
                SUM(CASE WHEN p.stock_actual = 0 THEN 1 ELSE 0 END) AS agotados,
                SUM(CASE WHEN p.stock_actual > 0 AND p.stock_actual <= p.stock_minimo THEN 1 ELSE 0 END) AS stock_bajo,
                SUM(CASE WHEN p.stock_actual > p.stock_minimo THEN 1 ELSE 0 END) AS ok,
                COALESCE(SUM(p.stock_actual * p.precio_compra), 0) AS valor_total_costo,
                COALESCE(SUM(p.stock_actual * (p.precio_venta - p.precio_compra)), 0) AS ganancia_potencial
            FROM productos p
            WHERE p.activo = TRUE
        `);
        const [top] = await db.query(`
            SELECT p.nombre AS producto,
                ROUND(((p.precio_venta - p.precio_compra) / p.precio_compra) * 100, 2) AS margen_pct
            FROM productos p
            WHERE p.activo = TRUE
            ORDER BY margen_pct DESC
            LIMIT 6
        `);
        res.json({ ...rows[0], top_margen: top });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getSeguridadKpis = async (req, res) => {
    try {
        const rows = await prisma.$queryRawUnsafe(`
            SELECT
                COUNT(*) AS total_usuarios,
                SUM(CASE WHEN u.activo = TRUE THEN 1 ELSE 0 END) AS activos,
                SUM(CASE WHEN u.activo = FALSE THEN 1 ELSE 0 END) AS inactivos
            FROM usuarios u
        `);
        const [porRol] = await db.query(`
            SELECT r.nombre AS rol, COUNT(*) AS cantidad
            FROM usuarios u
            LEFT JOIN roles r ON u.rol_id = r.id_rol
            GROUP BY r.nombre
            ORDER BY cantidad DESC
        `);
        res.json({ ...rows[0], por_rol: porRol });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getCarritosKpis = async (req, res) => {
    try {
        const rows = await prisma.$queryRawUnsafe(`
            SELECT
                COUNT(*) AS total_items,
                COALESCE(SUM(car.cantidad * p.precio_venta), 0) AS valor_potencial,
                SUM(CASE WHEN p.stock_actual = 0 OR p.stock_actual < car.cantidad THEN 1 ELSE 0 END) AS con_problema_stock
            FROM carrito car
            INNER JOIN productos p ON car.producto_id = p.id_producto
        `);
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getRepartidoresKpis = async (req, res) => {
    try {
        const rows = await prisma.$queryRawUnsafe(`
            SELECT
                COUNT(CASE WHEN ped.id_pedido IS NOT NULL THEN 1 END) AS total_pedidos,
                COUNT(CASE WHEN ped.fecha_entrega_real IS NOT NULL AND ped.fecha_entrega_real <= ped.fecha_entrega_est THEN 1 END) AS a_tiempo,
                COUNT(CASE WHEN ped.fecha_entrega_real IS NOT NULL AND ped.fecha_entrega_real > ped.fecha_entrega_est THEN 1 END) AS con_retraso
            FROM usuarios rep
            INNER JOIN roles r ON rep.rol_id = r.id_rol AND r.nombre = 'Repartidor'
            LEFT JOIN pedidos ped ON ped.repartidor_id = rep.id_usuario
        `);
        const [porRep] = await db.query(`
            SELECT rep.nombre AS repartidor, COUNT(ped.id_pedido) AS cantidad
            FROM usuarios rep
            INNER JOIN roles r ON rep.rol_id = r.id_rol AND r.nombre = 'Repartidor'
            LEFT JOIN pedidos ped ON ped.repartidor_id = rep.id_usuario
            GROUP BY rep.nombre
            ORDER BY cantidad DESC
        `);
        res.json({ ...rows[0], por_repartidor: porRep });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
