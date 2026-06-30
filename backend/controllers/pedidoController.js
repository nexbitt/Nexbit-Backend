/**
 * @file pedidoController.js
 * @description Controlador para la gestión de pedidos y transacciones de checkout.
 */
import { v2 as cloudinary } from 'cloudinary';
import Pedido from '../models/pedidoModel.js';
import prisma from '../config/prisma.js';
import { getIO } from '../socket.js';
import { success, error as responseError, notFound, badRequest, unauthorized, forbidden, conflict } from '../utils/responseHelper.js';

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
        const data = await Pedido.findAll(true, extraWhere);
        success(res, data);
    } catch (error) {
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

const getOne = async (req, res) => {
    try {
        const row = await Pedido.findById(req.params.id);
        if (!row) return notFound(res, 'Pedido');
        success(res, row);
    } catch (error) {
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

const checkout = async (req, res) => {
    try {
        const { usuario_id } = req.body;
        if (!usuario_id) return badRequest(res, "Se requiere usuario activo");

        const cartItems = await prisma.carrito.findMany({
            where: { usuario_id: Number(usuario_id) },
            include: { producto: { select: { precio_venta: true, nombre: true } } }
        });

        if (cartItems.length === 0) return badRequest(res, "El carrito está vacío");

        for (const item of cartItems) {
            const producto = await prisma.productos.findUnique({
                where: { id_producto: item.producto_id },
                select: { stock_actual: true, nombre: true }
            });
            if (!producto || producto.stock_actual < item.cantidad) {
                return badRequest(res, `Stock insuficiente para: ${producto?.nombre}`);
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

        success(res, {
            id_pedido: transactionResult.id_pedido,
            datos_bancarios: cuentasBancarias,
            total: Number(total)
        }, 'Pedido procesado con éxito', 201);
    } catch (error) {
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

const store = async (req, res) => {
    try {
        const { usuario_id, comprobante_pago_url } = req.body;
        if (!usuario_id) return badRequest(res, "El ID del usuario es obligatorio");

        const id = await Pedido.create(req.body);

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
                await prisma.notificaciones.create({
                    data: {
                        usuario_id: admin.id_usuario,
                        tipo: 'COMPROBANTE_SUBIDO',
                        titulo: `Nuevo comprobante de pago - Pedido #${id}`,
                        mensaje: `Se ha creado el pedido #${id} con comprobante de pago. Revisa y aprueba el pago.`,
                        pedido_id: id
                    }
                });
            }
            const io = getIO();
            io.to('admin').emit('notificacion:nuevo-comprobante', {
                pedido_id: id,
                titulo: `Nuevo comprobante de pago - Pedido #${id}`,
                mensaje: 'Se ha creado un pedido con comprobante de pago para revisión.'
            });
        }

        success(res, { id_pedido: id }, 'Pedido creado con éxito', 201);
    } catch (error) {
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

const update = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, ...rest } = req.body;

        if (estado) {
            const pedido = await Pedido.findById(id);
            if (!pedido) return notFound(res, 'Pedido');

            const transicionesValidas = {
                PENDIENTE:  ['CONFIRMADO'],
                EN_REVISION: ['APROBADO', 'RECHAZADO'],
                APROBADO:   ['ASIGNADO'],
                ASIGNADO:   ['EN_CAMINO'],
                EN_CAMINO:  ['ENTREGADO', 'CANCELADO'],
            };
            const permitidos = transicionesValidas[pedido.estado];
            if (!permitidos || !permitidos.includes(estado)) {
                return badRequest(res, `Transición inválida: ${pedido.estado} → ${estado}`);
            }
        }

        const actualizado = await Pedido.update(id, req.body);
        if (!actualizado) return notFound(res, 'Pedido');
        success(res, null, 'Pedido actualizado');
    } catch (error) {
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

const destroy = async (req, res) => {
    try {
        const { id } = req.params;
        const eliminado = await Pedido.delete(id);
        if (!eliminado) return notFound(res, 'Pedido');
        success(res, null, 'Pedido eliminado');
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return badRequest(res, 'No se puede eliminar este pedido porque tiene facturas o detalles asociados.');
        }
        responseError(res, 'SERVER_ERROR', error.message);
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
  DISPONIBLE: 'DISPONIBLE',
  EN_REPARTO: 'EN REPARTO',
};

const STATUS_COLORS = {
  PENDIENTE:   { bg: '#fef3c7', color: '#92400e' },
  CONFIRMADO:  { bg: '#e0f2fe', color: '#0369a1' },
  EN_REVISION: { bg: '#ffedd5', color: '#c2410c' },
  APROBADO:    { bg: '#d1fae5', color: '#065f46' },
  RECHAZADO:   { bg: '#fee2e2', color: '#dc2626' },
  ASIGNADO:    { bg: '#dbeafe', color: '#1d4ed8' },
  EN_CAMINO:   { bg: '#ede9fe', color: '#6d28d9' },
  ENTREGADO:   { bg: '#ccfbf1', color: '#0f766e' },
  CANCELADO:   { bg: '#ffe4e6', color: '#be123c' },
  DISPONIBLE:  { bg: '#cffafe', color: '#0891b2' },
  EN_REPARTO:  { bg: '#e0e7ff', color: '#4338ca' },
};

const getTicket = async (req, res) => {
    try {
        const pedido = await Pedido.findByIdWithDetails(req.params.id);
        if (!pedido) return notFound(res, 'Pedido');

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

        success(res, pedido);
    } catch (error) {
        responseError(res, 'SERVER_ERROR', error.message);
    }
};
const cancelar = async (req, res) => {
    try {
        const { id } = req.params;
        const pedido = await Pedido.findById(id);

        if (!pedido) {
            return notFound(res, 'Pedido');
        }

        if (pedido.estado !== 'PENDIENTE') {
            return badRequest(res, 'No se puede cancelar un pedido que ya no está PENDIENTE');
        }

        // LLAMADA A LA NUEVA FUNCIÓN DEL MODELO
        const actualizado = await Pedido.updateStatus(id, 'CANCELADO');

        if (actualizado) {
            success(res, null, 'Pedido cancelado con éxito');
        } else {
            responseError(res, 'SERVER_ERROR', 'No se pudo actualizar el estado');
        }
    } catch (error) {
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

const subirComprobante = async (req, res) => {
    try {
        const { id } = req.params;
        const pedido = await Pedido.findById(id);
        if (!pedido) return notFound(res, 'Pedido');
        if (pedido.estado !== 'PENDIENTE' && pedido.estado !== 'RECHAZADO') {
            return badRequest(res, 'El pedido debe estar en estado Pendiente o Rechazado');
        }
        if (!req.file) return badRequest(res, 'Debe subir un archivo de imagen');

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

        const comprobanteUrl = req.file.secure_url || req.file.url || req.file.path;
        const comprobantePublicId = req.file.public_id || req.file.filename || null;
        const actualizado = await prisma.pedidos.updateMany({
            where: { id_pedido: Number(id) },
            data: {
                comprobante_pago_url: comprobanteUrl,
                comprobante_pago_public_id: comprobantePublicId,
                estado: 'EN_REVISION'
            }
        });

        if (!actualizado) return responseError(res, 'SERVER_ERROR', 'No se pudo actualizar el comprobante');

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

        const admins = await prisma.usuarios.findMany({
            where: { rol_id: 1, activo: true },
            select: { id_usuario: true }
        });

        for (const admin of admins) {
            await prisma.notificaciones.create({
                data: {
                    usuario_id: admin.id_usuario,
                    tipo: 'COMPROBANTE_SUBIDO',
                    titulo: `Nuevo comprobante de pago - Pedido #${id}`,
                    mensaje: `El cliente ha subido un comprobante de pago para el pedido #${id}. Revisa y aprueba el pago.`,
                    pedido_id: Number(id)
                }
            });
        }

        const io = getIO();
        io.to('admin').emit('notificacion:nuevo-comprobante', {
            pedido_id: Number(id),
            titulo: `Nuevo comprobante de pago - Pedido #${id}`,
            mensaje: 'Un cliente ha subido un comprobante de pago para revisión.'
        });

        success(res, null, 'Comprobante subido con éxito. Pedido en revisión.');
    } catch (error) {
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

const aprobarPago = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.usuario.userId;
        const pedido = await Pedido.findById(id);
        if (!pedido) return notFound(res, 'Pedido');
        if (pedido.estado !== 'EN_REVISION') {
            return badRequest(res, 'El pedido no está en revisión');
        }

        const actualizado = await Pedido.updateStatus(id, 'APROBADO');
        if (!actualizado) return responseError(res, 'SERVER_ERROR', 'No se pudo aprobar el pago');

        await prisma.seguimiento_pedido.create({
            data: {
                pedido_id: Number(id),
                estado_anterior: 'EN_REVISION',
                estado_nuevo: 'APROBADO',
                cambiado_por: adminId,
                notas: 'Administrador aprobó el pago'
            }
        });

        await prisma.notificaciones.create({
            data: {
                usuario_id: pedido.usuario_id,
                tipo: 'PAGO_APROBADO',
                titulo: `Pago aprobado - Pedido #${id}`,
                mensaje: 'Tu pago ha sido aprobado. Tu pedido ya está disponible para entrega.',
                pedido_id: Number(id)
            }
        });

        const io = getIO();
        io.to(`usuario:${pedido.usuario_id}`).emit('notificacion:pago-aprobado', {
            pedido_id: Number(id),
            mensaje: 'Tu pago ha sido aprobado. Tu pedido está en proceso.'
        });

        success(res, null, 'Pago aprobado. Pedido listo para entrega.');
    } catch (error) {
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

const rechazarPago = async (req, res) => {
    try {
        const { id } = req.params;
        const { motivo } = req.body;
        const adminId = req.usuario.userId;
        const pedido = await Pedido.findById(id);
        if (!pedido) return notFound(res, 'Pedido');
        if (pedido.estado !== 'EN_REVISION') {
            return badRequest(res, 'El pedido no está en revisión');
        }

        const actualizado = await Pedido.updateStatusWithMotivo(id, 'RECHAZADO', motivo || 'Pago rechazado');
        if (!actualizado) return responseError(res, 'SERVER_ERROR', 'No se pudo rechazar el pago');

        await prisma.seguimiento_pedido.create({
            data: {
                pedido_id: Number(id),
                estado_anterior: 'EN_REVISION',
                estado_nuevo: 'RECHAZADO',
                cambiado_por: adminId,
                notas: motivo || 'Administrador rechazó el pago'
            }
        });

        await prisma.notificaciones.create({
            data: {
                usuario_id: pedido.usuario_id,
                tipo: 'PAGO_RECHAZADO',
                titulo: `Pago rechazado - Pedido #${id}`,
                mensaje: `Tu pago ha sido rechazado. Motivo: ${motivo || 'Pago no válido'}. Contacta al administrador para más información.`,
                pedido_id: Number(id)
            }
        });

        const io = getIO();
        io.to(`usuario:${pedido.usuario_id}`).emit('notificacion:pago-rechazado', {
            pedido_id: Number(id),
            mensaje: `Tu pago ha sido rechazado: ${motivo || 'Pago no válido'}`
        });

        success(res, null, 'Pago rechazado. Se notificará al cliente.');
    } catch (error) {
        responseError(res, 'SERVER_ERROR', error.message);
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
        success(res, data);
    } catch (error) {
        responseError(res, 'SERVER_ERROR', error.message);
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
        success(res, { tienePedidoActivo: !!pedido, pedido });
    } catch (error) {
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

const enviarComentario = async (req, res) => {
    try {
        const { id } = req.params;
        const { comentario } = req.body;
        const adminId = req.usuario.userId;
        const pedido = await Pedido.findById(id);
        if (!pedido) return notFound(res, 'Pedido');
        if (!comentario || !comentario.trim()) {
            return badRequest(res, 'El comentario es obligatorio');
        }

        const estadosValidos = ['EN_REVISION', 'PENDIENTE', 'APROBADO', 'RECHAZADO'];
        if (!estadosValidos.includes(pedido.estado)) {
            return badRequest(res, 'No se pueden enviar comentarios en este estado');
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

        success(res, null, 'Comentario enviado con éxito');
    } catch (error) {
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

const softDelete = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.usuario.userId;
        const pedido = await Pedido.findById(id);
        if (!pedido) return notFound(res, 'Pedido');
        if (pedido.usuario_id !== userId) {
            return forbidden(res, 'No puedes eliminar un pedido que no te pertenece');
        }
        const eliminado = await Pedido.softDelete(id);
        if (!eliminado) return notFound(res, 'Pedido');
        success(res, null, 'Pedido movido a la papelera');
    } catch (error) {
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

const restore = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.usuario.userId;
        const pedido = await Pedido.findById(id);
        if (!pedido) return notFound(res, 'Pedido');
        if (pedido.usuario_id !== userId) {
            return forbidden(res, 'No puedes restaurar un pedido que no te pertenece');
        }
        const restaurado = await Pedido.restore(id);
        if (!restaurado) return notFound(res, 'Pedido');
        success(res, null, 'Pedido restaurado de la papelera');
    } catch (error) {
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

const getTrash = async (req, res) => {
    try {
        const userId = req.usuario.userId;
        const data = await Pedido.findDeletedByUser(userId);
        success(res, data);
    } catch (error) {
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

const FSM_RULES = {
  transitions: {
    PENDIENTE:  ['CONFIRMADO', 'CANCELADO'],
    CONFIRMADO: ['EN_REVISION'],
    EN_REVISION: ['APROBADO', 'RECHAZADO'],
    APROBADO:   ['ASIGNADO'],
    ASIGNADO:   ['EN_CAMINO'],
    EN_CAMINO:  ['ENTREGADO', 'CANCELADO'],
    CANCELADO:  [],
    RECHAZADO:  ['PENDIENTE'],
    ENTREGADO:  [],
  },
  fsmMap: {
    ENTREGADO: 'ENTREGADO',
    CANCELADO: 'CANCELADO',
    ASIGNADO: 'EN_REPARTO',
    EN_CAMINO: 'EN_REPARTO',
    APROBADO: 'DISPONIBLE',
    EN_REVISION: 'EN_REVISION',
    RECHAZADO: 'RECHAZADO',
    PENDIENTE: 'PENDIENTE',
    CONFIRMADO: 'CONFIRMADO',
  },
  statusLabels: STATUS_LABELS,
  statusColors: STATUS_COLORS,
};

const getFsmRules = async (req, res) => {
  try {
    success(res, FSM_RULES);
  } catch (error) {
    responseError(res, 'SERVER_ERROR', error.message);
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
        
        success(res, result);
    } catch (error) {
        responseError(res, 'SERVER_ERROR', error.message);
    }
};

export default { getAll, getOne, checkout, store, update, destroy, getTicket, cancelar, subirComprobante, aprobarPago, rechazarPago, pedidosEnRevision, verificarPedidoActivo, enviarComentario, softDelete, restore, getTrash, getMisPedidos, getFsmRules };