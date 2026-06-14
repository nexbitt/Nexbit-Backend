import { v2 as cloudinary } from 'cloudinary';
import prisma from '../config/prisma.js';
import { getIO } from '../socket.js';

const simulacionController = {
  checkout: async (req, res) => {
    try {
      const adminId = req.usuario.userId;
      const adminNombre = req.usuario.user;
      const { productos, direccion_entrega, notas } = req.body;

      if (!productos || productos.length === 0) {
        return res.status(400).json({ message: 'Debe incluir al menos un producto' });
      }

      const adminUser = await prisma.usuarios.findUnique({
        where: { id_usuario: adminId },
        select: { nombre: true }
      });
      const adminName = adminUser?.nombre || adminNombre || 'Administrador';

      const productosConPrecio = await Promise.all(
        productos.map(async (item) => {
          const prod = await prisma.productos.findUnique({
            where: { id_producto: Number(item.producto_id) },
            select: { precio_venta: true, nombre: true, stock_actual: true }
          });
          if (!prod) throw new Error(`Producto ID ${item.producto_id} no encontrado`);
          if (prod.stock_actual < item.cantidad) {
            throw new Error(`Stock insuficiente para: ${prod.nombre}`);
          }
          return {
            producto_id: Number(item.producto_id),
            cantidad: Number(item.cantidad),
            precio_unitario: Number(prod.precio_venta),
            subtotal: Number(item.cantidad) * Number(prod.precio_venta),
            nombre: prod.nombre
          };
        })
      );

      const subtotal = productosConPrecio.reduce((acc, item) => acc + item.subtotal, 0);
      const impuesto = Math.round(subtotal * 0.19 * 100) / 100;
      const total = subtotal + impuesto;
      const auditoriaNota = `Pedido creado en simulacion por Admin: ${adminName}`;

      const transactionResult = await prisma.$transaction(async (tx) => {
        const pedido = await tx.pedidos.create({
          data: {
            usuario_id: adminId,
            subtotal,
            impuesto,
            total,
            estado: 'PENDIENTE',
            direccion_entrega: direccion_entrega || 'Direccion de prueba especificada por admin',
            notas_entrega: notas || null,
            simulado_por_admin: true,
            admin_id_operador: adminId,
            auditoria_nota: auditoriaNota
          }
        });

        for (const item of productosConPrecio) {
          await tx.detalle_pedido.create({
            data: {
              pedido_id: pedido.id_pedido,
              producto_id: item.producto_id,
              cantidad: item.cantidad,
              precio_unitario: item.precio_unitario,
              subtotal: item.subtotal
            }
          });

          await tx.productos.update({
            where: { id_producto: item.producto_id },
            data: { stock_actual: { decrement: item.cantidad } }
          });
        }

        await tx.seguimiento_pedido.create({
          data: {
            pedido_id: pedido.id_pedido,
            estado_anterior: null,
            estado_nuevo: 'PENDIENTE',
            cambiado_por: adminId,
            notas: auditoriaNota,
            modificado_en_simulacion: true,
            admin_id_operador: adminId,
            descripcion_cambio: `Pedido creado en simulación por Admin: ${adminName}`
          }
        });

        return pedido;
      });

      const cuentasBancarias = await prisma.configuracion_bancaria.findMany({
        where: { activo: true },
        select: { banco: true, tipo_cuenta: true, numero_cuenta: true, titular: true, documento: true, descripcion: true }
      });

      const io = getIO();
      io.to('admin').emit('notificacion:nuevo-pedido', {
        pedido_id: transactionResult.id_pedido,
        titulo: `Nuevo pedido #${transactionResult.id_pedido} (Simulación)`,
        mensaje: `Pedido creado por el administrador ${adminName} en modo simulación.`
      });

      res.status(201).json({
        message: 'Pedido creado en modo simulación',
        id_pedido: transactionResult.id_pedido,
        datos_bancarios: cuentasBancarias,
        total: Number(total)
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  subirComprobante: async (req, res) => {
    try {
      const { id } = req.params;
      const adminId = req.usuario.userId;

      const pedido = await prisma.pedidos.findUnique({
        where: { id_pedido: Number(id) }
      });

      if (!pedido) {
        return res.status(404).json({ message: 'Pedido no encontrado' });
      }

      if (pedido.estado !== 'PENDIENTE' && pedido.estado !== 'RECHAZADO') {
        return res.status(400).json({ message: 'El pedido debe estar en estado Pendiente o Rechazado' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'Debe subir un archivo de imagen' });
      }

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

      await prisma.pedidos.update({
        where: { id_pedido: Number(id) },
        data: {
          comprobante_pago_url: comprobanteUrl,
          comprobante_pago_public_id: comprobantePublicId,
          estado: 'EN_REVISION'
        }
      });

      const adminUser = await prisma.usuarios.findUnique({
        where: { id_usuario: adminId },
        select: { nombre: true }
      });
      const adminName = adminUser?.nombre || 'Administrador';

      await prisma.seguimiento_pedido.create({
        data: {
          pedido_id: Number(id),
          estado_anterior: pedido.estado,
          estado_nuevo: 'EN_REVISION',
          cambiado_por: adminId,
          notas: `Comprobante subido en modo simulación por Admin: ${adminName}`,
          modificado_en_simulacion: true,
          admin_id_operador: adminId,
          descripcion_cambio: `Comprobante de pago subido en simulación por Admin: ${adminName}`
        }
      });

      const io = getIO();
      io.to('admin').emit('notificacion:nuevo-comprobante', {
        pedido_id: Number(id),
        titulo: `Comprobante subido - Pedido #${id} (Simulación)`,
        mensaje: 'Comprobante de pago subido desde el modo simulación.'
      });

      res.json({ message: 'Comprobante subido con éxito. Pedido en revisión.' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  actualizarEstado: async (req, res) => {
    try {
      const { id } = req.params;
      const { estado } = req.body;
      const adminId = req.usuario.userId;

      if (!estado || !['EN_CAMINO', 'ENTREGADO', 'CANCELADO'].includes(estado)) {
        return res.status(400).json({ message: 'Estado inválido. Use: EN_CAMINO, ENTREGADO o CANCELADO' });
      }

      const pedido = await prisma.pedidos.findUnique({
        where: { id_pedido: Number(id) }
      });

      if (!pedido) {
        return res.status(404).json({ message: 'Pedido no encontrado' });
      }

      const adminUser = await prisma.usuarios.findUnique({
        where: { id_usuario: adminId },
        select: { nombre: true }
      });
      const adminName = adminUser?.nombre || 'Administrador';

      if (estado === 'EN_CAMINO' && pedido.estado !== 'APROBADO' && pedido.estado !== 'ASIGNADO') {
        return res.status(400).json({ message: 'El pedido debe estar en estado APROBADO o ASIGNADO para iniciar ruta' });
      }
      if (estado === 'ENTREGADO' && pedido.estado !== 'EN_CAMINO' && pedido.estado !== 'ASIGNADO') {
        return res.status(400).json({ message: 'El pedido debe estar en EN_CAMINO o ASIGNADO para confirmar entrega' });
      }

      const updateData = { estado };
      if (estado === 'ENTREGADO') {
        updateData.fecha_entrega_real = new Date();
      }

      await prisma.pedidos.update({
        where: { id_pedido: Number(id) },
        data: updateData
      });

      let descripcionCambio = '';
      if (estado === 'EN_CAMINO') {
        descripcionCambio = `Inicio de ruta en simulación por Admin: ${adminName}`;
      } else if (estado === 'ENTREGADO') {
        descripcionCambio = `Entrega confirmada en Modo Repartidor por Admin: ${adminName}`;
      } else {
        descripcionCambio = `Pedido cancelado en simulación por Admin: ${adminName}`;
      }

      await prisma.seguimiento_pedido.create({
        data: {
          pedido_id: Number(id),
          estado_anterior: pedido.estado,
          estado_nuevo: estado,
          cambiado_por: adminId,
          notas: descripcionCambio,
          modificado_en_simulacion: true,
          admin_id_operador: adminId,
          descripcion_cambio: descripcionCambio
        }
      });

      const io = getIO();
      io.emit('pedido:disponibles', { pedidoId: Number(id), estado });

      let mensaje = '';
      if (estado === 'EN_CAMINO') mensaje = 'Ruta iniciada en modo simulación';
      else if (estado === 'ENTREGADO') mensaje = 'Entrega confirmada en modo simulación';
      else mensaje = 'Pedido cancelado en modo simulación';

      res.json({ message: mensaje });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  listarDisponibles: async (req, res) => {
    try {
      const pedidos = await prisma.pedidos.findMany({
        where: {
          estado: { in: ['APROBADO', 'ASIGNADO', 'EN_CAMINO'] }
        },
        orderBy: { fecha_pedido: 'desc' },
        include: {
          usuario: { select: { nombre: true, direccion: true, telefono: true } },
          detalle_pedido: {
            include: { producto: { select: { nombre: true, imagen_url: true } } }
          }
        }
      });

      const result = pedidos.map(p => ({
        id_pedido: p.id_pedido,
        estado: p.estado,
        cliente: p.usuario?.nombre || 'Desconocido',
        direccion: p.direccion_entrega || p.usuario?.direccion || '',
        telefono: p.usuario?.telefono || '',
        total: Number(p.total),
        items: p.detalle_pedido.map(d => ({
          nombre: d.producto?.nombre,
          cantidad: d.cantidad,
          imagen: d.producto?.imagen_url
        })),
        fecha: p.fecha_pedido,
        simulado_por_admin: p.simulado_por_admin
      }));

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

export default simulacionController;
