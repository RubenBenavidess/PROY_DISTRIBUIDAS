const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { createServer } = require('http'); // Para WebSockets
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();
const httpServer = createServer(app);


const corsOptions = {
    origin: 'http://localhost:5173', 
    credentials: true // Permite el envío de cookies
};

const PORT = process.env.G_PORT || 8080;

const isDocker = process.env.DOCKER_ENV === 'true';
const AUTH_SERVICE_URL = isDocker ? 'http://auth-api:3000' : 'http://localhost:3000';
const MESSAGE_SERVICE_URL = isDocker ? 'http://message-management-microservice:3002' : 'http://localhost:3002';

console.log(`[CONFIG] Running in ${isDocker ? 'Docker' : 'Local'} mode`);
console.log(`[CONFIG] AUTH_SERVICE_URL: ${AUTH_SERVICE_URL}`);
console.log(`[CONFIG] MESSAGE_SERVICE_URL: ${MESSAGE_SERVICE_URL}`);

app.use(helmet()); 
app.use(cors(corsOptions)); 
app.use(morgan('dev'));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 50,
    message: 'Demasiadas solicitudes desde esta IP.\n Intente de nuevo más tarde.',
    standardHeaders: true,
    legacyHeaders: false,
    
    // ignora socket.io
    skip: (req) => {
        if (req.url.startsWith('/api/socket.io')) {
            return true; 
        }
        return false; 
    }
});

app.use(limiter); 

// Rutas de Autenticación
app.use('/auth', createProxyMiddleware({
    target: AUTH_SERVICE_URL,
    changeOrigin: true,
    logLevel: 'debug'
}));

// Rutas de API y Sockets (Mensajes)
const messageProxy = createProxyMiddleware({
    target: MESSAGE_SERVICE_URL,
    changeOrigin: true,
    ws: true, 
    logLevel: 'debug'
});

app.use('/api', messageProxy);

// Manejo Manual de Upgrade 
httpServer.on('upgrade', (req, socket, head) => {
    console.log('[HPM] Handling WebSocket upgrade...');
    if (req.url.startsWith('/api')) {
        messageProxy.upgrade(req, socket, head);
    } else {
        socket.destroy();
    }
});

// Ruta de Salud
app.get('/gateway/health', (req, res) => {
    res.status(200).send('API Gateway corriendo correctamente');
});

httpServer.listen(PORT, () => {
    console.log(`API Gateway (con WS) corriendo en http://localhost:${PORT}`);
});