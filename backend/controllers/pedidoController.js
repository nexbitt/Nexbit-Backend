/**
 * @file pedidoController.js
 * @description Controlador para la gestión de pedidos y transacciones de checkout.
 */
import { v2 as cloudinary } from 'cloudinary';
import prisma from '../config/prisma.js';
import { getIO } from '../socket.js';
import { uploadToCloudinary } from '../middleware/uploadMiddleware.js';

const getAll = async (req, res) => {
    try {
        const { usuario_id, estado, filterFecha, search } = req.query;
        const extraWhere = {};
        if (usuario_id) extraWhere.usuario_id = Number(usuario_id);
        if (estado) extraWhere.estado = estado;
        if (filterFecha === 'today') {
            extraWhere.fecha_pedido = { gte: new Date(new Date().setHours(0,0,0,0)) };
        } else if (filterFecha === 'week') {
            const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
            extraWhere.fecha_pedido = { gte: weekAgo };
        } else if (filterFecha === 'month') {
            const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
            extraWhere.fecha_pedido = { gte: monthAgo };
        }
        if (search) {
            extraWhere.OR = [
                { usuario: { nombre: { contains: search } } },
                { usuario: { numero_documento: { contains: search } } },
                { id_pedido: isNaN(Number(search)) ? undefined : Number(search) },
            ].filter(Boolean);
        }
        const baseWhere = { status_pedido: 'activo' };
        const where = { ...baseWhere, ...extraWhere };
        const data = await prisma.pedidos.findMany({
            where,
            orderBy: { id_pedido: 'asc' },
            include: {
                usuario: { select: { nombre: true } },
                seguimiento_pedido: {
                    orderBy: { fecha: 'desc' },
                    take: 2,
                    select: { notas: true, estado_nuevo: true, cambiado_por: true, fecha: true },
                },
            },
        });
        const mapped = data.map(p => {
            const events = p.seguimiento_pedido || [];
            const problemaEvent = events.find(e =>
                e.notas?.includes('PROBLEMA') ||
                e.notas?.includes('Cancelado por repartidor')
            );
            const alertEvent = problemaEvent || events[0];
            const tieneAlerta = alertEvent &&
                (alertEvent.notas?.includes('PROBLEMA') ||
                 alertEvent.notas?.includes('Cancelado por repartidor') ||
                 alertEvent.notas?.includes('Liberación automática')) &&
                p.estado !== 'ENTREGADO';
            return {
                ...p,
                usuario_nombre: p.usuario?.nombre,
                usuario: undefined,
                seguimiento_pedido: undefined,
                alerta: tieneAlerta
                    ? { motivo: alertEvent.notas, fecha: alertEvent.fecha }
                    : null,
                fsm_estado:
                    p.estado === 'ENTREGADO' ? 'ENTREGADO' :
                    p.estado === 'CANCELADO' ? 'CANCELADO' :
                    p.estado === 'ASIGNADO' || p.estado === 'EN_CAMINO' ? 'EN_REPARTO' :
                    p.estado === 'APROBADO' && !p.repartidor_id ? 'DISPONIBLE' :
                    p.estado === 'EN_REVISION' ? 'EN_REVISION' :
                    p.estado === 'RECHAZADO' ? 'RECHAZADO' :
                    p.estado,
            };
        });
        res.json(mapped);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getOne = async (req, res) => {
    try {
        const p = await prisma.pedidos.findUnique({
            where: { id_pedido: Number(req.params.id) },
            include: { usuario: { select: { nombre: true } } }
        });
        if (!p) return res.status(404).json({ message: "Pedido no encontrado" });
        res.json({ ...p, usuario_nombre: p.usuario?.nombre, usuario: undefined });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const checkout = async (req, res) => {
    try {
        const { usuario_id } = req.body;
        if (!usuario_id) return res.status(400).json({ message: "Se requiere usuario activo" });

        const cartItems = await prisma.carrito.findMany({
            where: { usuario_id: Number(usuario_id) },
            include: { producto: { select: { precio_venta: true, nombre: true } } }
        });

        if (cartItems.length === 0) return res.status(400).json({ message: "El carrito está vacío" });

        for (const item of cartItems) {
            const producto = await prisma.productos.findUnique({
                where: { id_producto: item.producto_id },
                select: { stock_actual: true, nombre: true }
            });
            if (!producto || producto.stock_actual < item.cantidad) {
                return res.status(400).json({
                    message: `Stock insuficiente para: ${producto?.nombre}`
                });
            }
        }

        const total = cartItems.reduce((acc, item) =>
            acc + (item.cantidad * Number(item.producto.precio_venta)), 0
        );

        const transactionResult = await prisma.$transaction(async (tx) => {
            const pedido = await tx.pedidos.create({
                data: { usuario_id: Number(usuario_id), total, estado: 'PENDIENTE' }
            });
            for (const item of cartItems) {
                const precio = Number(item.producto.precio_venta);
                await tx.detalle_pedido.create({
                    data: {
                        pedido_id: pedido.id_pedido,
                        producto_id: item.producto_id,
                        cantidad: item.cantidad,
                        precio_unitario: precio,
                        subtotal: item.cantidad * precio
                    }
                });
                
                await tx.productos.update({
                    where: { id_producto: item.producto_id },
                    data: {
                        stock_actual: { decrement: item.cantidad }
                    }
                });
            }
            await tx.carrito.deleteMany({ where: { usuario_id: Number(usuario_id) } });
            return pedido;
        });

        // Obtener datos bancarios para mostrar al cliente
        const cuentasBancarias = await prisma.configuracion_bancaria.findMany({
            where: { activo: true },
            select: { banco: true, tipo_cuenta: true, numero_cuenta: true, titular: true, documento: true, descripcion: true }
        });

        const io = getIO();
        io.to('admin').emit('notificacion:nuevo-pedido', {
            pedido_id: transactionResult.id_pedido,
            titulo: `Nuevo pedido #${transactionResult.id_pedido}`,
            mensaje: 'Un cliente ha realizado un nuevo pedido.'
        });

        res.status(201).json({
            message: "Pedido procesado con éxito",
            id_pedido: transactionResult.id_pedido,
            datos_bancarios: cuentasBancarias,
            total: Number(total)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const store = async (req, res) => {
    try {
        const { usuario_id, comprobante_pago_url, subtotal, impuesto, total, estado, direccion_entrega, notas_entrega, simulado_por_admin, admin_id_operador, auditoria_nota, comprobante_pago_public_id, productos } = req.body;
        if (!usuario_id) return res.status(400).json({ message: "El ID del usuario es obligatorio" });

        const hasComprobante = !!comprobante_pago_url;

        // Si se enviaron productos desde AdminCheckoutModal, calcular totales desde la BD
        let productosData = [];
        let calcSubtotal = subtotal;
        let calcImpuesto = impuesto;
        let calcTotal = total;

        if (productos && productos.length > 0) {
            const ids = productos.map(p => p.producto_id);
            const dbProductos = await prisma.productos.findMany({
                where: { id_producto: { in: ids } },
                select: { id_producto: true, precio_venta: true, stock_actual: true, nombre: true }
            });
            const precioMap = Object.fromEntries(dbProductos.map(p => [p.id_producto, p]));
            const stockMap = Object.fromEntries(dbProductos.map(p => [p.id_producto, p]));

            for (const item of productos) {
                const prod = precioMap[item.producto_id];
                if (!prod) {
                    return res.status(400).json({ message: `Producto ID ${item.producto_id} no encontrado` });
                }
                if (prod.stock_actual < item.cantidad) {
                    return res.status(400).json({ message: `Stock insuficiente para: ${prod.nombre}` });
                }
                const precio = Number(prod.precio_venta);
                productosData.push({
                    producto_id: item.producto_id,
                    cantidad: item.cantidad,
                    precio_unitario: precio,
                    subtotal: item.cantidad * precio
                });
            }

            calcSubtotal = productosData.reduce((acc, p) => acc + p.subtotal, 0);
            calcImpuesto = calcSubtotal * 0.19;
            calcTotal = calcSubtotal + calcImpuesto;
        }

        const created = await prisma.pedidos.create({
            data: {
                usuario_id: Number(usuario_id),
                subtotal: calcSubtotal || 0,
                impuesto: calcImpuesto || 0,
                total: calcTotal || 0,
                estado: hasComprobante ? 'EN_REVISION' : (estado || 'PENDIENTE'),
                direccion_entrega: direccion_entrega || null,
                notas_entrega: notas_entrega || null,
                simulado_por_admin: simulado_por_admin || false,
                admin_id_operador: admin_id_operador ? Number(admin_id_operador) : null,
                auditoria_nota: auditoria_nota || null,
                comprobante_pago_url: comprobante_pago_url || null,
                comprobante_pago_public_id: comprobante_pago_public_id || null
            }
        });
        const id = created.id_pedido;

        // Crear detalle_pedido y descontar stock si hay productos
        if (productosData.length > 0) {
            for (const item of productosData) {
                await prisma.detalle_pedido.create({
                    data: {
                        pedido_id: id,
                        producto_id: item.producto_id,
                        cantidad: item.cantidad,
                        precio_unitario: item.precio_unitario,
                        subtotal: item.subtotal
                    }
                });
                await prisma.productos.update({
                    where: { id_producto: item.producto_id },
                    data: { stock_actual: { decrement: item.cantidad } }
                });
            }
        }

        if (comprobante_pago_url) {
            await prisma.seguimiento_pedido.create({
                data: {
                    pedido_id: id,
                    estado_anterior: null,
                    estado_nuevo: 'EN_REVISION',
                    cambiado_por: Number(usuario_id),
                    notas: 'Administrador creó pedido con comprobante de pago'
                }
            });

            const admins = await prisma.usuarios.findMany({
                where: { rol_id: 1, activo: true },
                select: { id_usuario: true }
            });
            for (const admin of admins) {
                try {
                    await prisma.notificaciones.create({
                        data: {
                            usuario_id: admin.id_usuario,
                            tipo: 'COMPROBANTE_SUBIDO',
                            titulo: `Nuevo comprobante de pago - Pedido #${id}`,
                            mensaje: `Se ha creado el pedido #${id} con comprobante de pago. Revisa y aprueba el pago.`,
                            pedido_id: id
                        }
                    });
                } catch (notifErr) {
                    console.error('Error al crear notificación:', notifErr.message);
                }
            }
            const io = getIO();
            io.to('admin').emit('notificacion:nuevo-comprobante', {
                pedido_id: id,
                titulo: `Nuevo comprobante de pago - Pedido #${id}`,
                mensaje: 'Se ha creado un pedido con comprobante de pago para revisión.'
            });
        }

        res.status(201).json({ message: "Pedido creado con éxito", id_pedido: id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const update = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, ...rest } = req.body;

        if (estado) {
            const pedido = await prisma.pedidos.findUnique({
                where: { id_pedido: Number(id) },
                include: { usuario: { select: { nombre: true } } }
            });
            if (!pedido) return res.status(404).json({ message: "Pedido no encontrado" });

            const transicionesValidas = {
                PENDIENTE:  ['CONFIRMADO'],
                EN_REVISION: ['APROBADO', 'RECHAZADO'],
                APROBADO:   ['ASIGNADO'],
                ASIGNADO:   ['EN_CAMINO'],
                EN_CAMINO:  ['ENTREGADO', 'CANCELADO'],
            };
            const permitidos = transicionesValidas[pedido.estado];
            if (!permitidos || !permitidos.includes(estado)) {
                return res.status(400).json({
                    message: `Transición inválida: ${pedido.estado} → ${estado}`
                });
            }
        }

        const { subtotal: s, impuesto: i, total: t, estado: e } = req.body;
        const result = await prisma.pedidos.updateMany({
            where: { id_pedido: Number(id) },
            data: { subtotal: s, impuesto: i, total: t, estado: e }
        });
        if (!result.count) return res.status(404).json({ message: "Pedido no encontrado" });
        res.json({ message: "Pedido actualizado" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const destroy = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await prisma.pedidos.deleteMany({ where: { id_pedido: Number(id) } });
        if (!result.count) return res.status(404).json({ message: "Pedido no encontrado" });
        res.json({ message: "Pedido eliminado" });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ error: "No se puede eliminar este pedido porque tiene facturas o detalles asociados." });
        }
        res.status(500).json({ message: error.message });
    }
};

const STATUS_LABELS = {
  PENDIENTE: 'PENDIENTE DE PAGO',
  CONFIRMADO: 'CONFIRMADO',
  EN_REVISION: 'EN REVISIÓN',
  APROBADO: 'APROBADO',
  RECHAZADO: 'RECHAZADO',
  ASIGNADO: 'ASIGNADO',
  EN_CAMINO: 'EN CAMINO',
  ENTREGADO: 'ENTREGADO',
  CANCELADO: 'CANCELADO',
};

const STATUS_COLORS = {
  PENDIENTE: { bg: '#fef9c3', color: '#854d0e' },
  CONFIRMADO: { bg: '#ecfdf5', color: '#065f46' },
  EN_REVISION: { bg: '#fff7ed', color: '#c2410c' },
  APROBADO: { bg: '#f0fdf4', color: '#166534' },
  RECHAZADO: { bg: '#fef2f2', color: '#991b1b' },
  ASIGNADO: { bg: '#eff6ff', color: '#1e40af' },
  EN_CAMINO: { bg: '#eef2ff', color: '#4338ca' },
  ENTREGADO: { bg: '#ecfdf5', color: '#065f46' },
  CANCELADO: { bg: '#fef2f2', color: '#b91c1c' },
};

const getTicket = async (req, res) => {
    try {
        const pedido = await prisma.pedidos.findUnique({
            where: { id_pedido: Number(req.params.id) },
            include: {
                usuario: { select: { nombre: true, email: true, numero_documento: true, telefono: true, direccion: true } },
                detalle_pedido: {
                    orderBy: { id_detalle_pedido: 'asc' },
                    include: { producto: { select: { nombre: true, imagen_url: true } } }
                }
            }
        });
        if (!pedido) return res.status(404).json({ message: "Pedido no encontrado" });
        pedido.usuario_nombre = pedido.usuario?.nombre;
        pedido.usuario_email = pedido.usuario?.email;
        pedido.numero_documento = pedido.usuario?.numero_documento;
        pedido.usuario_telefono = pedido.usuario?.telefono;
        pedido.direccion = pedido.usuario?.direccion;
        pedido.detalles = (pedido.detalle_pedido || []).map(d => ({
            ...d,
            producto_nombre: d.producto?.nombre,
            imagen_url: d.producto?.imagen_url || null,
            producto: undefined
        }));
        delete pedido.usuario;
        delete pedido.detalle_pedido;

        if (req.query.format === 'html') {
            const detalles = pedido.detalles || [];
            const filasProductos = detalles.length > 0
                ? detalles.map(d => `
                    <tr>
                        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${d.producto_nombre}</td>
                        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${d.cantidad}</td>
                        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">$${Number(d.precio_unitario).toLocaleString()}</td>
                        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">$${Number(d.subtotal).toLocaleString()}</td>
                    </tr>
                `).join('')
                : `<tr><td colspan="4" style="padding:12px;text-align:center;color:#94a3b8;">Este pedido no tiene productos detallados</td></tr>`;

            const estado = pedido.estado || 'PENDIENTE';
            const label = STATUS_LABELS[estado] || estado;
            const colors = STATUS_COLORS[estado] || { bg: '#f1f5f9', color: '#334155' };
            const estadoClass = estado.toLowerCase();

            const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Ticket de Compra - #${pedido.id_pedido}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: #e2e8f0; padding: 40px 20px; color: #1e293b; }
    .ticket { max-width: 800px; margin: 0 auto; background: #fff; box-shadow: 0 10px 30px rgba(0,0,0,0.1); overflow: hidden; }
    .ticket-header { padding: 40px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; }
    .company-info .brand { font-size: 2rem; font-weight: 800; color: #0f172a; letter-spacing: -1px; margin-bottom: 8px; }
    .company-info .details { font-size: 0.85rem; color: #64748b; line-height: 1.6; }
    .invoice-details { text-align: right; }
    .invoice-details .title { font-size: 1.5rem; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; }
    .invoice-details .order-id { font-size: 1rem; color: #64748b; font-weight: 500; }
    .ticket-body { padding: 40px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
    .info-box { background: #f8fafc; padding: 24px; border-radius: 8px; border: 1px solid #e2e8f0; }
    .info-box h3 { font-size: 0.85rem; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 12px; letter-spacing: 1px; }
    .info-box p { font-size: 0.95rem; color: #0f172a; font-weight: 500; margin-bottom: 4px; }
    .info-box .light { color: #64748b; font-weight: 400; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
    thead th { background: #0f172a; color: #fff; padding: 16px; font-size: 0.85rem; text-transform: uppercase; font-weight: 600; text-align: left; letter-spacing: 1px; }
    thead th:nth-child(2), thead th:nth-child(3), thead th:nth-child(4) { text-align: center; }
    thead th:nth-child(3), thead th:nth-child(4) { text-align: right; }
    tbody td { padding: 16px; font-size: 0.95rem; color: #334155; border-bottom: 1px solid #e2e8f0; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    .total-section { display: flex; justify-content: flex-end; }
    .total-box { width: 300px; background: #f8fafc; padding: 24px; border-radius: 8px; border: 1px solid #e2e8f0; }
    .total-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; }
    .total-row.final { border-top: 2px solid #cbd5e1; padding-top: 16px; margin-top: 8px; }
    .total-row .label { font-size: 0.9rem; font-weight: 600; color: #64748b; }
    .total-row.final .label { font-size: 1.2rem; font-weight: 800; color: #0f172a; }
    .total-row .amount { font-size: 1rem; font-weight: 600; color: #334155; }
    .total-row.final .amount { font-size: 1.5rem; font-weight: 800; color: #0f172a; }
    .ticket-footer { text-align: center; padding: 32px 40px; background: #0f172a; color: #fff; }
    .ticket-footer p { font-size: 0.9rem; margin-bottom: 8px; opacity: 0.9; }
    .ticket-footer .doc-info { font-size: 0.8rem; opacity: 0.6; }
    .status-badge { display: inline-block; padding: 6px 16px; border-radius: 4px; font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-top: 12px; }
    @media print {
      body { background: #fff; padding: 0; }
      .ticket { box-shadow: none; border: none; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div style="text-align:center;margin-bottom:24px;" class="no-print">
    <button onclick="window.print()" style="padding:14px 40px;background:#2563eb;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;font-size:1.1rem;letter-spacing:0.5px;transition:background 0.2s;box-shadow:0 4px 6px rgba(37,99,235,0.2);">
      Imprimir Ticket
    </button>
  </div>
  <div class="ticket">
    <div class="ticket-header">
      <div class="company-info">
        <div class="brand">RematesPaisa</div>
        <div class="details">
          NIT: 900.123.456-7<br/>
          Calle Falsa 123, Medellín, Colombia<br/>
          Tel: +57 (4) 123 4567<br/>
          soporte@rematespaisa.com
        </div>
      </div>
      <div class="invoice-details">
        <div class="title">Ticket de Compra</div>
        <div class="order-id">Nº ${String(pedido.id_pedido).padStart(6, '0')}</div>
        <div class="status-badge" style="background:${colors.bg};color:${colors.color};">${label}</div>
      </div>
    </div>
    <div class="ticket-body">
      <div class="info-grid">
        <div class="info-box">
          <h3>Datos del Cliente</h3>
          <p>${pedido.usuario_nombre || 'N/A'}</p>
          <p class="light">Documento: ${pedido.numero_documento || 'N/A'}</p>
          ${pedido.direccion ? `<p class="light">Dirección: ${pedido.direccion}</p>` : ''}
        </div>
        <div class="info-box">
          <h3>Detalles de Emisión</h3>
          <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <span class="light">Fecha:</span>
            <span>${new Date(pedido.fecha_pedido).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span class="light">Moneda:</span>
            <span>COP (Pesos Colombianos)</span>
          </div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Descripción</th>
            <th>Cant.</th>
            <th>Precio Unit.</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${filasProductos}
        </tbody>
      </table>
      <div class="total-section">
        <div class="total-box">
          <div class="total-row">
            <span class="label">Subtotal</span>
            <span class="amount">$${Number(pedido.total).toLocaleString()}</span>
          </div>
          <div class="total-row">
            <span class="label">Impuestos (IVA 0%)</span>
            <span class="amount">$0</span>
          </div>
          <div class="total-row final">
            <span class="label">Total a Pagar</span>
            <span class="amount">$${Number(pedido.total).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="ticket-footer">
      <p>Gracias por tu compra en RematesPaisa. ¡Vuelve pronto!</p>
      <div class="doc-info">
        Documento generado el ${new Date().toLocaleString('es-CO')}
      </div>
    </div>
  </div>
</body>
</html>`;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.send(html);
        }

        res.json(pedido);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
const cancelar = async (req, res) => {
    try {
        const { id } = req.params;
        const pedido = await prisma.pedidos.findUnique({
            where: { id_pedido: Number(id) },
            include: { usuario: { select: { nombre: true } } }
        });

        if (!pedido) {
            return res.status(404).json({ message: "Pedido no encontrado" });
        }

        if (pedido.estado !== 'PENDIENTE') {
            return res.status(400).json({
                message: "No se puede cancelar un pedido que ya no está PENDIENTE"
            });
        }

        const result = await prisma.pedidos.updateMany({
            where: { id_pedido: Number(id) },
            data: { estado: 'CANCELADO' }
        });

        if (result.count) {
            res.json({ message: "Pedido cancelado con éxito" });
        } else {
            res.status(500).json({ message: "No se pudo actualizar el estado" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const subirComprobante = async (req, res) => {
    try {
        const { id } = req.params;
        const pedido = await prisma.pedidos.findUnique({
            where: { id_pedido: Number(id) },
            include: { usuario: { select: { nombre: true } } }
        });
        if (!pedido) return res.status(404).json({ message: "Pedido no encontrado" });
        if (pedido.estado !== 'PENDIENTE' && pedido.estado !== 'RECHAZADO') {
            return res.status(400).json({ message: "El pedido debe estar en estado Pendiente o Rechazado" });
        }
        if (!req.file) return res.status(400).json({ message: "Debe subir un archivo de imagen" });

        // Si ya hay un comprobante anterior, eliminarlo de Cloudinary
        if (pedido.comprobante_pago_url) {
            try {
                const urlParts = pedido.comprobante_pago_url.split('/');
                const folderAndFile = urlParts.slice(-3).join('/');
                const publicId = folderAndFile.substring(0, folderAndFile.lastIndexOf('.'));
                await cloudinary.uploader.destroy(publicId);
            } catch (_) {
                // No interrumpir si falla la limpieza
            }
        }

        // Subir el archivo a Cloudinary manualmente desde el buffer (memoryStorage)
        const cloudResult = await uploadToCloudinary(req.file.buffer, 'rematespaisa/comprobantes', {
            allowed_formats: ['jpg', 'jpeg', 'png'],
            transformation: [{ width: 1200, height: 1200, crop: 'limit' }, { quality: 'auto' }]
        });
        const comprobanteUrl = cloudResult.secure_url || cloudResult.url;
        const comprobantePublicId = cloudResult.public_id;
        const actualizado = await prisma.pedidos.updateMany({
            where: { id_pedido: Number(id) },
            data: {
                comprobante_pago_url: comprobanteUrl,
                comprobante_pago_public_id: comprobantePublicId,
                estado: 'EN_REVISION'
            }
        });

        if (!actualizado.count) return res.status(500).json({ message: "No se pudo actualizar el comprobante" });

        const estadoAnterior = pedido.estado;

        await prisma.seguimiento_pedido.create({
            data: {
                pedido_id: Number(id),
                estado_anterior: estadoAnterior,
                estado_nuevo: 'EN_REVISION',
                cambiado_por: pedido.usuario_id,
                notas: estadoAnterior === 'RECHAZADO'
                    ? 'Cliente re-subió comprobante de pago tras rechazo'
                    : 'Cliente subió comprobante de pago'
            }
        });

        try {
            const admins = await prisma.usuarios.findMany({
                where: { rol_id: 1, activo: true },
                select: { id_usuario: true }
            });
            for (const admin of admins) {
                try {
                    await prisma.notificaciones.create({
                        data: {
                            usuario_id: admin.id_usuario,
                            tipo: 'COMPROBANTE_SUBIDO',
                            titulo: `Nuevo comprobante de pago - Pedido #${id}`,
                            mensaje: `El cliente ha subido un comprobante de pago para el pedido #${id}. Revisa y aprueba el pago.`,
                            pedido_id: Number(id)
                        }
                    });
                } catch (notifErr) {
                    console.error('Error al crear notificación:', notifErr.message);
                }
            }
        } catch (_) {}

        try {
            const io = getIO();
            io.to('admin').emit('notificacion:nuevo-comprobante', {
                pedido_id: Number(id),
                titulo: `Nuevo comprobante de pago - Pedido #${id}`,
                mensaje: 'Un cliente ha subido un comprobante de pago para revisión.'
            });
        } catch (_) {}

        res.json({ message: "Comprobante subido con éxito. Pedido en revisión." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const aprobarPago = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.usuario.userId;
        const pedido = await prisma.pedidos.findUnique({
            where: { id_pedido: Number(id) },
            include: { usuario: { select: { nombre: true } } }
        });
        if (!pedido) return res.status(404).json({ message: "Pedido no encontrado" });
        if (pedido.estado !== 'EN_REVISION') {
            return res.status(400).json({ message: "El pedido no está en revisión" });
        }

        const result = await prisma.pedidos.updateMany({
            where: { id_pedido: Number(id) },
            data: { estado: 'APROBADO' }
        });
        if (!result.count) return res.status(500).json({ message: "No se pudo aprobar el pago" });

        await prisma.seguimiento_pedido.create({
            data: {
                pedido_id: Number(id),
                estado_anterior: pedido.estado,
                estado_nuevo: 'APROBADO',
                cambiado_por: adminId,
                notas: 'Administrador aprobó el pago'
            }
        });

        try {
            await prisma.notificaciones.create({
                data: {
                    usuario_id: pedido.usuario_id,
                    tipo: 'PAGO_APROBADO',
                    titulo: `Pago aprobado - Pedido #${id}`,
                    mensaje: 'Tu pago ha sido aprobado. Tu pedido ya está disponible para entrega.',
                    pedido_id: Number(id)
                }
            });
        } catch (notifErr) {
            console.error('Error al crear notificación:', notifErr.message);
        }

        const io = getIO();
        io.to(`usuario:${pedido.usuario_id}`).emit('notificacion:pago-aprobado', {
            pedido_id: Number(id),
            mensaje: 'Tu pago ha sido aprobado. Tu pedido está en proceso.'
        });

        res.json({ message: "Pago aprobado. Pedido listo para entrega." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const rechazarPago = async (req, res) => {
    try {
        const { id } = req.params;
        const { motivo } = req.body;
        const adminId = req.usuario.userId;
        const pedido = await prisma.pedidos.findUnique({
            where: { id_pedido: Number(id) },
            include: { usuario: { select: { nombre: true } } }
        });
        if (!pedido) return res.status(404).json({ message: "Pedido no encontrado" });
        if (pedido.estado !== 'EN_REVISION') {
            return res.status(400).json({ message: "El pedido no está en revisión" });
        }

        const motivoRechazo = motivo || 'Pago rechazado';
        const result = await prisma.pedidos.updateMany({
            where: { id_pedido: Number(id) },
            data: { estado: 'RECHAZADO', motivo_rechazo: motivoRechazo }
        });
        if (!result.count) return res.status(500).json({ message: "No se pudo rechazar el pago" });

        await prisma.seguimiento_pedido.create({
            data: {
                pedido_id: Number(id),
                estado_anterior: pedido.estado,
                estado_nuevo: 'RECHAZADO',
                cambiado_por: adminId,
                notas: motivo || 'Administrador rechazó el pago'
            }
        });

        try {
            await prisma.notificaciones.create({
                data: {
                    usuario_id: pedido.usuario_id,
                    tipo: 'PAGO_RECHAZADO',
                    titulo: `Pago rechazado - Pedido #${id}`,
                    mensaje: `Tu pago ha sido rechazado. Motivo: ${motivo || 'Pago no válido'}. Contacta al administrador para más información.`,
                    pedido_id: Number(id)
                }
            });
        } catch (notifErr) {
            console.error('Error al crear notificación:', notifErr.message);
        }

        const io = getIO();
        io.to(`usuario:${pedido.usuario_id}`).emit('notificacion:pago-rechazado', {
            pedido_id: Number(id),
            mensaje: `Tu pago ha sido rechazado: ${motivo || 'Pago no válido'}`
        });

        res.json({ message: "Pago rechazado. Se notificará al cliente." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const pedidosEnRevision = async (req, res) => {
    try {
        const data = await prisma.pedidos.findMany({
            where: { estado: 'EN_REVISION' },
            orderBy: { fecha_pedido: 'desc' },
            include: {
                usuario: { select: { nombre: true, email: true, telefono: true } },
                detalle_pedido: {
                    include: { producto: { select: { nombre: true, imagen_url: true } } }
                }
            }
        });
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const verificarPedidoActivo = async (req, res) => {
    try {
        const { usuario_id } = req.params;
        const pedido = await prisma.pedidos.findFirst({
            where: {
                usuario_id: Number(usuario_id),
                estado: { in: ['EN_REVISION', 'PENDIENTE'] }
            },
            select: { id_pedido: true, estado: true }
        });
        res.json({ tienePedidoActivo: !!pedido, pedido });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const enviarComentario = async (req, res) => {
    try {
        const { id } = req.params;
        const { comentario } = req.body;
        const adminId = req.usuario.userId;
        const pedido = await prisma.pedidos.findUnique({
            where: { id_pedido: Number(id) },
            include: { usuario: { select: { nombre: true } } }
        });
        if (!pedido) return res.status(404).json({ message: "Pedido no encontrado" });
        if (!comentario || !comentario.trim()) {
            return res.status(400).json({ message: "El comentario es obligatorio" });
        }

        const estadosValidos = ['EN_REVISION', 'PENDIENTE', 'APROBADO', 'RECHAZADO'];
        if (!estadosValidos.includes(pedido.estado)) {
            return res.status(400).json({ message: "No se pueden enviar comentarios en este estado" });
        }

        await prisma.seguimiento_pedido.create({
            data: {
                pedido_id: Number(id),
                estado_anterior: pedido.estado,
                estado_nuevo: pedido.estado,
                cambiado_por: adminId,
                notas: `COMENTARIO: ${comentario.trim()}`
            }
        });

        res.json({ message: "Comentario enviado con éxito" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const softDelete = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.usuario.userId;
        const pedido = await prisma.pedidos.findUnique({
            where: { id_pedido: Number(id) },
            include: { usuario: { select: { nombre: true } } }
        });
        if (!pedido) return res.status(404).json({ message: "Pedido no encontrado" });
        if (pedido.usuario_id !== userId) {
            return res.status(403).json({ message: "No puedes eliminar un pedido que no te pertenece" });
        }
        const result = await prisma.pedidos.updateMany({
            where: { id_pedido: Number(id) },
            data: { status_pedido: 'eliminado_usuario' }
        });
        if (!result.count) return res.status(404).json({ message: "Pedido no encontrado" });
        res.json({ message: "Pedido movido a la papelera" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const restore = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.usuario.userId;
        const pedido = await prisma.pedidos.findUnique({
            where: { id_pedido: Number(id) },
            include: { usuario: { select: { nombre: true } } }
        });
        if (!pedido) return res.status(404).json({ message: "Pedido no encontrado" });
        if (pedido.usuario_id !== userId) {
            return res.status(403).json({ message: "No puedes restaurar un pedido que no te pertenece" });
        }
        const result = await prisma.pedidos.updateMany({
            where: { id_pedido: Number(id) },
            data: { status_pedido: 'activo' }
        });
        if (!result.count) return res.status(404).json({ message: "Pedido no encontrado" });
        res.json({ message: "Pedido restaurado de la papelera" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getTrash = async (req, res) => {
    try {
        const userId = req.usuario.userId;
        const deletedRows = await prisma.pedidos.findMany({
            where: { usuario_id: Number(userId), status_pedido: 'eliminado_usuario' },
            orderBy: { fecha_pedido: 'desc' },
            include: {
                seguimiento_pedido: {
                    orderBy: { fecha: 'desc' },
                    take: 1,
                    select: { notas: true, estado_nuevo: true, fecha: true },
                },
            },
        });
        const data = deletedRows.map(p => ({
            ...p,
            seguimiento_pedido: undefined,
            fsm_estado:
                p.estado === 'ENTREGADO' ? 'ENTREGADO' :
                p.estado === 'CANCELADO' ? 'CANCELADO' :
                p.estado === 'ASIGNADO' || p.estado === 'EN_CAMINO' ? 'EN_REPARTO' :
                p.estado === 'APROBADO' && !p.repartidor_id ? 'DISPONIBLE' :
                p.estado === 'EN_REVISION' ? 'EN_REVISION' :
                p.estado === 'RECHAZADO' ? 'RECHAZADO' :
                p.estado,
        }));
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getMisPedidos = async (req, res) => {
    try {
        const { usuario_id } = req.params;
        const rows = await prisma.pedidos.findMany({
            where: {
                usuario_id: Number(usuario_id),
                status_pedido: 'activo'
            },
            orderBy: { fecha_pedido: 'desc' },
            include: {
                usuario: { select: { nombre: true, numero_documento: true } },
                detalle_pedido: {
                    orderBy: { id_detalle_pedido: 'asc' },
                    include: { producto: { select: { nombre: true, imagen_url: true } } }
                }
            }
        });
        
        const result = rows.map(pedido => ({
            ...pedido,
            usuario_nombre: pedido.usuario?.nombre,
            numero_documento: pedido.usuario?.numero_documento,
            usuario: undefined,
            detalles: pedido.detalle_pedido.map(d => ({
                ...d,
                producto_nombre: d.producto?.nombre,
                imagen_url: d.producto?.imagen_url || null,
                producto: undefined
            })),
            detalle_pedido: undefined
        }));
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export default { getAll, getOne, checkout, store, update, destroy, getTicket, cancelar, subirComprobante, aprobarPago, rechazarPago, pedidosEnRevision, verificarPedidoActivo, enviarComentario, softDelete, restore, getTrash, getMisPedidos };