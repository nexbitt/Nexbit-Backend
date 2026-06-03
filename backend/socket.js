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
    if (repartidorId) {
      socket.join(`repartidor:${repartidorId}`);
    }
    socket.on('disconnect', () => {});
  });

  return io;
};

export default configureSocket;
