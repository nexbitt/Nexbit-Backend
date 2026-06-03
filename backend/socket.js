import { Server } from 'socket.io';

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

    // Chat events
    socket.on('chat:join', (conversacionId) => {
      socket.join(`chat:${conversacionId}`);
    });

    socket.on('chat:leave', (conversacionId) => {
      socket.leave(`chat:${conversacionId}`);
    });

    socket.on('chat:send', (data) => {
      const { conversacionId, mensaje, remitenteId } = data;
      io.to(`chat:${conversacionId}`).emit('chat:message', {
        conversacionId,
        mensaje,
        remitenteId,
        created_at: new Date().toISOString(),
      });
      io.to('admin').emit('notificacion:chat', { conversacionId, remitenteId });
    });

    socket.on('chat:typing', (data) => {
      const { conversacionId, usuarioId } = data;
      socket.to(`chat:${conversacionId}`).emit('chat:typing', { conversacionId, usuarioId });
    });

    socket.on('disconnect', () => {});
  });

  return io;
};

export default configureSocket;