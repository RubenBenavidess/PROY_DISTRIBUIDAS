const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { createServer } = require('http'); // Para WebSocket
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();
const httpServer = createServer(app); // Usamos el server HTTP para app y sockets

// --- Configuración de CORS ---
// Define el puerto exacto de tu frontend (Vite)
const corsOptions = {
  origin: 'http://localhost:5173', 
  credentials: true // Permite que el navegador envíe cookies
};

// --- Configuración de Puertos y URLs ---
const PORT = process.env.G_PORT || 8080;

// URLs de los microservicios (detecta si está en Docker o local)
const isDocker = process.env.DOCKER_ENV === 'true';
const AUTH_SERVICE_URL = isDocker ? 'http://auth-api:3000' : 'http://localhost:3000';
const MESSAGE_SERVICE_URL = isDocker ? 'http://message-management-microservice:3002' : 'http://localhost:3002';

console.log(`[CONFIG] Running in ${isDocker ? 'Docker' : 'Local'} mode`);
console.log(`[CONFIG] AUTH_SERVICE_URL: ${AUTH_SERVICE_URL}`);
console.log(`[CONFIG] MESSAGE_SERVICE_URL: ${MESSAGE_SERVICE_URL}`);

// --- Middlewares Principales ---
app.use(helmet()); // Headers de seguridad
app.use(cors(corsOptions)); // Aplica la política de CORS
app.use(morgan('dev')); // Logs de peticiones

// --- Rate Limiter (Con regla para ignorar Sockets) ---
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // 100 peticiones por IP
    message: 'Demasiadas solicitudes desde esta IP.\n Intente de nuevo más tarde.',
    standardHeaders: true,
    legacyHeaders: false,
    
    // ¡LA CLAVE! Ignora el 'polling' de Socket.IO para no bloquearlo
    skip: (req) => {
        if (req.url.startsWith('/api/socket.io')) {
            return true; // true = saltar el límite
        }
        return false; // false = aplicar límite
    }
});

app.use(limiter); // Aplica el rate limiting a todas las rutas

// --- Reglas del Proxy ---

// Regla 1: Rutas de Autenticación
app.use('/auth', createProxyMiddleware({
    target: AUTH_SERVICE_URL,
    changeOrigin: true,
    logLevel: 'debug'
}));

// Regla 2: Rutas de API y Sockets (Mensajes)
const messageProxy = createProxyMiddleware({
    target: MESSAGE_SERVICE_URL,
    changeOrigin: true,
    ws: true, // Habilita el proxy para WebSockets
    logLevel: 'debug'
});

app.use('/api', messageProxy);

// --- Manejo Manual de Upgrade (Para WebSockets) ---
// Es necesario porque el proxy no maneja el 'upgrade' por sí solo
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

// --- Iniciar el Servidor ---
// Usamos httpServer.listen() en lugar de app.listen()
httpServer.listen(PORT, () => {
    console.log(`API Gateway (con WS) corriendo en http://localhost:${PORT}`);
});