import { Server } from 'socket.io';
import { SOCKET_EVENTS } from './utils/socketEvents.js';

let io = null;

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO no ha sido inicializado');
  }
  return io;
};

export const configureSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    const repartidorId = socket.handshake.query.repartidorId;
    const userId = socket.handshake.query.userId;
    const userRole = socket.handshake.query.userRole;

    if (repartidorId) {
      socket.join(`repartidor:${repartidorId}`);
    }

    if (userId) {
      socket.join(`usuario:${userId}`);
      if (userRole === 'Administrador') {
        socket.join('admin');
      }
    }

    if (userRole === 'Repartidor') {
      socket.join('repartidores');
    }

    // Chat events
    socket.on(SOCKET_EVENTS.CHAT_JOIN, (conversacionId) => {
      socket.join(`chat:${conversacionId}`);
    });

    socket.on(SOCKET_EVENTS.CHAT_LEAVE, (conversacionId) => {
      socket.leave(`chat:${conversacionId}`);
    });

    socket.on(SOCKET_EVENTS.CHAT_SEND, (data) => {
      const { conversacionId, mensaje, remitenteId } = data;
      io.to(`chat:${conversacionId}`).emit('chat:message', {
        conversacionId,
        mensaje,
        remitenteId,
        created_at: new Date().toISOString(),
      });
      io.to('admin').emit('notificacion:chat', { conversacionId, remitenteId });
    });

    socket.on(SOCKET_EVENTS.CHAT_TYPING, (data) => {
      const { conversacionId, usuarioId } = data;
      socket.to(`chat:${conversacionId}`).emit(SOCKET_EVENTS.CHAT_TYPING, { conversacionId, usuarioId });
    });

    socket.on('disconnect', () => {});
  });

  return io;
};

export const emitNuevoPedidoDisponible = (pedidoId, data) => {
  if (io) {
    io.to('repartidores').emit(SOCKET_EVENTS.NUEVO_PEDIDO_DISPONIBLE, { pedido_id: pedidoId, ...data });
  }
};

export default configureSocket;