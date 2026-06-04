import prisma from '../config/prisma.js';
import { getIO } from '../socket.js';

const obtenerOCrearConversacion = async (req, res) => {
  try {
    const { pedido_id } = req.params;
    const userId = req.usuario.userId;
    const userRoleId = req.usuario.rol_id;

    let conversacion = await prisma.conversaciones.findUnique({
      where: { pedido_id: Number(pedido_id) },
      include: {
        mensajes: {
          orderBy: { created_at: 'asc' },
          include: { remitente: { select: { id_usuario: true, nombre: true, rol_id: true } } }
        },
        usuario: { select: { id_usuario: true, nombre: true } },
        admin: { select: { id_usuario: true, nombre: true } }
      }
    });

    if (!conversacion) {
      const pedido = await prisma.pedidos.findUnique({
        where: { id_pedido: Number(pedido_id) },
        select: { usuario_id: true }
      });
      if (!pedido) return res.status(404).json({ message: 'Pedido no encontrado' });

      const adminId = userRoleId === 1 ? userId : null;

      conversacion = await prisma.conversaciones.create({
        data: {
          pedido_id: Number(pedido_id),
          usuario_id: pedido.usuario_id,
          admin_id: adminId
        },
        include: {
          mensajes: {
            orderBy: { created_at: 'asc' },
            include: { remitente: { select: { id_usuario: true, nombre: true, rol_id: true } } }
          },
          usuario: { select: { id_usuario: true, nombre: true } },
          admin: { select: { id_usuario: true, nombre: true } }
        }
      });
    }

    res.json(conversacion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const enviarMensaje = async (req, res) => {
  try {
    const { conversacion_id } = req.params;
    const { mensaje } = req.body;
    const remitenteId = req.usuario.userId;

    if (!mensaje || !mensaje.trim()) {
      return res.status(400).json({ message: 'El mensaje no puede estar vacío' });
    }

    const conversacion = await prisma.conversaciones.findUnique({
      where: { id_conversacion: Number(conversacion_id) }
    });
    if (!conversacion) return res.status(404).json({ message: 'Conversación no encontrada' });

    const nuevoMensaje = await prisma.mensajes.create({
      data: {
        conversacion_id: Number(conversacion_id),
        remitente_id: remitenteId,
        mensaje: mensaje.trim()
      },
      include: { remitente: { select: { id_usuario: true, nombre: true, rol_id: true } } }
    });

    await prisma.conversaciones.update({
      where: { id_conversacion: Number(conversacion_id) },
      data: { updated_at: new Date() }
    });

    const io = getIO();
    io.to(`chat:${conversacion_id}`).emit('chat:message', nuevoMensaje);

    if (req.usuario.rol_id !== 1) {
      io.to('admin').emit('notificacion:chat', {
        conversacion_id: Number(conversacion_id),
        mensaje: nuevoMensaje.mensaje,
        remitente_id: remitenteId
      });
    }

    res.status(201).json(nuevoMensaje);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const marcarLeidos = async (req, res) => {
  try {
    const { conversacion_id } = req.params;
    const userId = req.usuario.userId;

    await prisma.mensajes.updateMany({
      where: {
        conversacion_id: Number(conversacion_id),
        remitente_id: { not: userId },
        leido: false
      },
      data: { leido: true }
    });

    res.json({ message: 'Mensajes marcados como leídos' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const obtenerMensajesNoLeidos = async (req, res) => {
  try {
    const userId = req.usuario.userId;

    const count = await prisma.mensajes.count({
      where: {
        conversacion: { usuario_id: userId },
        remitente_id: { not: userId },
        leido: false
      }
    });

    res.json({ noLeidos: count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const listarConversacionesAdmin = async (req, res) => {
  try {
    const conversaciones = await prisma.conversaciones.findMany({
      orderBy: { updated_at: 'desc' },
      include: {
        usuario: { select: { id_usuario: true, nombre: true } },
        pedido: { select: { id_pedido: true, total: true, estado: true, comprobante_pago_url: true } },
        mensajes: {
          orderBy: { created_at: 'desc' },
          take: 1,
          include: { remitente: { select: { nombre: true } } }
        }
      }
    });

    const result = await Promise.all(conversaciones.map(async (c) => {
      const noLeidos = await prisma.mensajes.count({
        where: {
          conversacion_id: c.id_conversacion,
          remitente_id: { not: req.usuario.userId },
          leido: false
        }
      });
      return { ...c, mensajes_no_leidos: noLeidos };
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export default {
  obtenerOCrearConversacion,
  enviarMensaje,
  marcarLeidos,
  obtenerMensajesNoLeidos,
  listarConversacionesAdmin
};