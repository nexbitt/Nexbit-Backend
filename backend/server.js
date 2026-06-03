import http from 'http';
import app from './app.js';
import { configureSocket } from './socket.js';

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

configureSocket(server);

server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});