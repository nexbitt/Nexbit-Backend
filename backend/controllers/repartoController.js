import prisma from '../config/prisma.js';
import { getIO } from '../socket.js';
import { success, error as responseError, notFound, badRequest, unauthorized, forbidden, conflict } from '../utils/responseHelper.js';

const emitStateChange = (pedidoId, estado, repartidorId) => {
  const io = getIO();
  io.to(`repartidor:${repartidorId}`).emit('pedido:estado', { pedidoId, estado });
  io.emit('pedido:disponibles', { pedidoId, estado });
};

const obtenerDisponibles = async (req, res) => {
  const repartidorId = req.usuario.userId;
  try {
    const pedidos = await prisma.pedidos.findMany({
      where: {
        repartidor_id: null,
        estado: { in: ['APROBADO'] },
      },
      include: {
        usuario: { select: { nombre: true, direccion: true, telefono: true } },
        detalle_pedido: {
          include: { producto: { select: { nombre: true, imagen_url: true } } },
        },
        seguimiento_pedido: { orderBy: { fecha: 'desc' }, take: 2 },
      },
      orderBy: { fecha_pedido: 'asc' },
    });

    const disponibles = pedidos.map((p) => {
      const events = p.seguimiento_pedido || [];
      const problemaEvent = events.find(e =>
        e.notas?.includes('PROBLEMA') ||
        e.notas?.includes('Cancelado por repartidor')
      );
      const alertEvent = problemaEvent || events[0];
      const tieneAlerta =
        alertEvent &&
        alertEvent.estado_nuevo === 'APROBADO' &&
        alertEvent.cambiado_por !== null;

      return {
        id_pedido: p.id_pedido,
        fsm_estado: 'DISPONIBLE',
        cliente: p.usuario?.nombre || 'Desconocido',
        direccion: p.direccion_entrega || p.usuario?.direccion || '',
        telefono: p.usuario?.telefono || '',
        total: Number(p.total),
        items: p.detalle_pedido.map((d) => ({
          nombre: d.producto?.nombre,
          cantidad: d.cantidad,
          imagen: d.producto?.imagen_url,
        })),
        fecha: p.fecha_pedido,
        alerta: tieneAlerta
          ? { motivo: alertEvent.notas || 'Cancelado por repartidor' }
          : null,
      };
    });

    success(res, disponibles);
  } catch (error) {
    console.error('Error al obtener pedidos disponibles:', error);
    responseError(res, 'SERVER_ERROR', 'Error obteniendo pedidos disponibles');
  }
};

const obtenerActivo = async (req, res) => {
  const repartidorId = req.usuario.userId;
  try {
    const pedido = await prisma.pedidos.findFirst({
      where: {
        repartidor_id: repartidorId,
        estado: { in: ['ASIGNADO', 'EN_CAMINO'] },
      },
      include: {
        usuario: { select: { nombre: true, direccion: true, telefono: true } },
        detalle_pedido: {
          include: { producto: { select: { nombre: true, imagen_url: true } } },
        },
      },
      orderBy: { fecha_asignacion: 'desc' },
    });

    if (!pedido) {
      return success(res, null);
    }

    success(res, {
      id_pedido: pedido.id_pedido,
      fsm_estado: pedido.estado === 'ASIGNADO' ? 'EN_REPARTO' : 'EN_CAMINO',
      estado_db: pedido.estado,
      cliente: pedido.usuario?.nombre || 'Desconocido',
      direccion: pedido.direccion_entrega || pedido.usuario?.direccion || '',
      telefono: pedido.usuario?.telefono || '',
      total: Number(pedido.total),
      items: pedido.detalle_pedido.map((d) => ({
        nombre: d.producto?.nombre,
        cantidad: d.cantidad,
        imagen: d.producto?.imagen_url,
      })),
      fecha_asignacion: pedido.fecha_asignacion,
    });
  } catch (error) {
    console.error('Error al obtener pedido activo:', error);
    responseError(res, 'SERVER_ERROR', 'Error obteniendo pedido activo');
  }
};

const obtenerHistorial = async (req, res) => {
  const repartidorId = req.usuario.userId;
  const { filtro } = req.query;
  try {
    const interacciones = await prisma.seguimiento_pedido.findMany({
      where: { cambiado_por: repartidorId },
      orderBy: { fecha: 'desc' },
      distinct: ['pedido_id'],
      select: { pedido_id: true },
    });

    const pedidoIds = interacciones.map((s) => s.pedido_id);

    if (pedidoIds.length === 0) {
      return success(res, []);
    }

    const pedidos = await prisma.pedidos.findMany({
      where: {
        id_pedido: { in: pedidoIds },
        ...(filtro === 'entregados' ? { estado: 'ENTREGADO' } : {}),
        ...(filtro === 'cancelados' ? { estado: 'CANCELADO' } : {}),
      },
      include: {
        usuario: { select: { nombre: true } },
        detalle_pedido: {
          include: { producto: { select: { nombre: true } } },
        },
        seguimiento_pedido: {
          where: { cambiado_por: repartidorId },
          orderBy: { fecha: 'desc' },
        },
      },
      orderBy: { fecha_pedido: 'desc' },
    });

    const historial = pedidos
      .map((p) => {
        const ultimaAccion = p.seguimiento_pedido[0];
        const estadoHistorico =
          ultimaAccion?.estado_nuevo === 'ENTREGADO'
            ? 'ENTREGADO'
            : ultimaAccion?.estado_nuevo === 'APROBADO'
              ? 'CANCELADO'
              : ultimaAccion?.estado_nuevo === 'ASIGNADO'
                ? 'EN_REPARTO'
                : 'CANCELADO';

        return {
          id_pedido: p.id_pedido,
          fsm_estado: estadoHistorico,
          estado_actual: p.estado,
          cliente: p.usuario?.nombre || 'Desconocido',
          total: Number(p.total),
          items: p.detalle_pedido.map((d) => d.producto?.nombre),
          fecha: p.fecha_pedido,
          ultimo_seguimiento: p.seguimiento_pedido[0]?.notas || '',
          fecha_entrega: p.fecha_entrega_real,
        };
      });

    success(res, historial);
  } catch (error) {
    console.error('Error al obtener historial:', error);
    responseError(res, 'SERVER_ERROR', 'Error obteniendo historial');
  }
};

const tomarPedido = async (req, res) => {
  const { id_pedido } = req.params;
  const repartidorId = req.usuario.userId;
  try {
    const result = await prisma.pedidos.updateMany({
      where: {
        id_pedido: parseInt(id_pedido),
        repartidor_id: null,
        estado: { in: ['APROBADO'] },
      },
      data: {
        estado: 'ASIGNADO',
        repartidor_id: repartidorId,
        fecha_asignacion: new Date(),
      },
    });

    if (result.count === 0) {
      return conflict(res, 'El pedido ya no está disponible.');
    }

    await prisma.seguimiento_pedido.create({
      data: {
        pedido_id: parseInt(id_pedido),
        estado_anterior: 'APROBADO',
        estado_nuevo: 'ASIGNADO',
        cambiado_por: repartidorId,
        notas: 'Repartidor tomó el pedido',
      },
    });

    emitStateChange(parseInt(id_pedido), 'EN_REPARTO', repartidorId);
    success(res, null, 'Pedido tomado exitosamente.');
  } catch (error) {
    console.error('Error al tomar pedido:', error);
    responseError(res, 'SERVER_ERROR', 'Error al tomar el pedido.');
  }
};

const marcarEnCamino = async (req, res) => {
  const { id_pedido } = req.params;
  const repartidorId = req.usuario.userId;
  try {
    const result = await prisma.pedidos.updateMany({
      where: {
        id_pedido: parseInt(id_pedido),
        repartidor_id: repartidorId,
        estado: 'ASIGNADO',
      },
      data: { estado: 'EN_CAMINO' },
    });

    if (result.count === 0) {
      return badRequest(res, 'No se pudo actualizar. Verifique el estado.');
    }

    await prisma.seguimiento_pedido.create({
      data: {
        pedido_id: parseInt(id_pedido),
        estado_anterior: 'ASIGNADO',
        estado_nuevo: 'EN_CAMINO',
        cambiado_por: repartidorId,
        notas: 'Repartidor en camino al destino',
      },
    });

    emitStateChange(parseInt(id_pedido), 'EN_CAMINO', repartidorId);
    success(res, null, 'Estado actualizado: en camino.');
  } catch (error) {
    console.error('Error al marcar en camino:', error);
    responseError(res, 'SERVER_ERROR', 'Error al actualizar estado.');
  }
};

const confirmarEntrega = async (req, res) => {
  const { id_pedido } = req.params;
  const repartidorId = req.usuario.userId;
  try {
    const result = await prisma.pedidos.updateMany({
      where: {
        id_pedido: parseInt(id_pedido),
        repartidor_id: repartidorId,
        estado: { in: ['ASIGNADO', 'EN_CAMINO'] },
      },
      data: {
        estado: 'ENTREGADO',
        fecha_entrega_real: new Date(),
      },
    });

    if (result.count === 0) {
      return badRequest(res, 'No se pudo confirmar la entrega.');
    }

    await prisma.seguimiento_pedido.create({
      data: {
        pedido_id: parseInt(id_pedido),
        estado_anterior: 'EN_CAMINO',
        estado_nuevo: 'ENTREGADO',
        cambiado_por: repartidorId,
        notas: 'Pedido entregado por repartidor',
      },
    });

    emitStateChange(parseInt(id_pedido), 'ENTREGADO', repartidorId);
    success(res, null, 'Entrega confirmada exitosamente.');
  } catch (error) {
    console.error('Error al confirmar entrega:', error);
    responseError(res, 'SERVER_ERROR', 'Error al confirmar la entrega.');
  }
};

const cancelarPedido = async (req, res) => {
  const { id_pedido } = req.params;
  const repartidorId = req.usuario.userId;
  const { motivo } = req.body;
  try {
    const pedido = await prisma.pedidos.findFirst({
      where: {
        id_pedido: parseInt(id_pedido),
        repartidor_id: repartidorId,
        estado: { in: ['ASIGNADO', 'EN_CAMINO'] },
      },
    });

    if (!pedido) {
      return badRequest(res, 'No se pudo cancelar el pedido.');
    }

    const result = await prisma.pedidos.update({
      where: { id_pedido: parseInt(id_pedido) },
      data: {
        estado: 'APROBADO',
        repartidor_id: null,
        fecha_asignacion: null,
      },
    });

    if (!result) {
      return badRequest(res, 'No se pudo cancelar el pedido.');
    }

    await prisma.seguimiento_pedido.create({
      data: {
        pedido_id: parseInt(id_pedido),
        estado_anterior: pedido.estado,
        estado_nuevo: 'APROBADO',
        cambiado_por: repartidorId,
        notas: motivo || `Cancelado por repartidor (estaba ${pedido.estado})`,
      },
    });

    emitStateChange(parseInt(id_pedido), 'DISPONIBLE', repartidorId);
    success(res, null, 'Pedido liberado. Ya está disponible para otros repartidores.');
  } catch (error) {
    console.error('Error al cancelar pedido:', error);
    responseError(res, 'SERVER_ERROR', 'Error al cancelar el pedido.');
  }
};

const reportarProblema = async (req, res) => {
  const { id_pedido } = req.params;
  const { descripcion } = req.body;
  const repartidorId = req.usuario.userId;
  try {
    const pedido = await prisma.pedidos.findFirst({
      where: {
        id_pedido: parseInt(id_pedido),
        repartidor_id: repartidorId,
        estado: { in: ['ASIGNADO', 'EN_CAMINO'] },
      },
    });

    if (!pedido) {
      return notFound(res, 'Pedido');
    }

    await prisma.seguimiento_pedido.create({
      data: {
        pedido_id: parseInt(id_pedido),
        estado_anterior: pedido.estado,
        estado_nuevo: pedido.estado,
        cambiado_por: repartidorId,
        notas: `PROBLEMA: ${descripcion || 'Sin descripción'}`,
      },
    });

    const timer = 5 * 60 * 1000;
    setTimeout(async () => {
      const actual = await prisma.pedidos.findUnique({
        where: { id_pedido: parseInt(id_pedido) },
      });
      if (actual && actual.repartidor_id === repartidorId && actual.estado !== 'ENTREGADO' && actual.estado !== 'APROBADO') {
        await prisma.pedidos.update({
          where: { id_pedido: parseInt(id_pedido) },
          data: { estado: 'APROBADO', repartidor_id: null, fecha_asignacion: null },
        });
        await prisma.seguimiento_pedido.create({
          data: {
            pedido_id: parseInt(id_pedido),
            estado_anterior: actual.estado,
            estado_nuevo: 'APROBADO',
            cambiado_por: repartidorId,
            notas: 'Liberación automática por problema no resuelto en 5 min',
          },
        });
        emitStateChange(parseInt(id_pedido), 'DISPONIBLE', repartidorId);
      }
    }, timer);

    success(res, { temporizador_minutos: 5 }, 'Problema reportado. Si no se resuelve en 5 minutos, se cancelará automáticamente.');
  } catch (error) {
    console.error('Error al reportar problema:', error);
    responseError(res, 'SERVER_ERROR', 'Error al reportar problema.');
  }
};

const obtenerStats = async (req, res) => {
  const repartidorId = req.usuario.userId;
  try {
    const [disponibles, activo, interacciones] = await Promise.all([
      prisma.pedidos.count({
        where: { repartidor_id: null, estado: { in: ['APROBADO'] } },
      }),
      prisma.pedidos.count({
        where: { repartidor_id: repartidorId, estado: { in: ['ASIGNADO', 'EN_CAMINO'] } },
      }),
      prisma.seguimiento_pedido.findMany({
        where: { cambiado_por: repartidorId },
        orderBy: { fecha: 'desc' },
        distinct: ['pedido_id'],
        select: { pedido_id: true },
      }),
    ]);

    const pedidoIds = interacciones.map((s) => s.pedido_id);
    let entregados = 0, cancelados = 0;
    if (pedidoIds.length > 0) {
      const pedidos = await prisma.pedidos.findMany({
        where: { id_pedido: { in: pedidoIds } },
        select: { id_pedido: true, estado: true },
      });
      for (const p of pedidos) {
        if (p.estado === 'ENTREGADO') entregados++;
        else if (p.estado === 'CANCELADO') cancelados++;
      }
    }

    success(res, { disponibles, activo, entregados, cancelados });
  } catch (error) {
    console.error('Error al obtener stats:', error);
    responseError(res, 'SERVER_ERROR', 'Error obteniendo estadísticas');
  }
};

const zonasCalientes = async (req, res) => {
  try {
    const pedidosRecientes = await prisma.pedidos.findMany({
      where: {
        fecha_pedido: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      select: { direccion_entrega: true },
      take: 100,
    });

    const zonas = {};
    pedidosRecientes.forEach((p) => {
      if (p.direccion_entrega) {
        const zona = p.direccion_entrega.split(',')[0]?.trim() || p.direccion_entrega;
        zonas[zona] = (zonas[zona] || 0) + 1;
      }
    });

    const topZonas = Object.entries(zonas)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([zona, conteo]) => ({
        zona,
        probabilidad: Math.min(Math.round((conteo / pedidosRecientes.length) * 100), 95),
        pedidos_recientes: conteo,
      }));

    success(res, topZonas);
  } catch (error) {
    console.error('Error al calcular zonas calientes:', error);
    responseError(res, 'SERVER_ERROR', 'Error al calcular zonas calientes');
  }
};

export default {
  obtenerDisponibles,
  obtenerActivo,
  obtenerHistorial,
  obtenerStats,
  tomarPedido,
  marcarEnCamino,
  confirmarEntrega,
  cancelarPedido,
  reportarProblema,
  zonasCalientes,
};
