const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();

const corsOptions = {
  origin: 'http://localhost:5173', // El puerto de tu frontend (Vite)
  credentials: true // ¡ESTA ES LA LÍNEA MÁGICA!
};

// Gateway port
const PORT = process.env.G_PORT;

// Microservice 
const AUTH_SERVICE_URL = 'http://auth-api:3000';
const MESSAGE_SERVICE_URL = 'http://message-management-microservice:3002';

// Middlewares
app.use(helmet()); // Security headers
app.use(cors(corsOptions)); // Enable CORS for all routes
app.use(morgan('dev')); // Logging

const limiter =rateLimit({
    windowMs: 15 * 60 * 1000, //15 minutes window
    max: 100, // each IP has 100 requests per windowMs
    message: 'Demasiadas solicitudes desde esta IP.\n Intente de nuevo más tarde.',
    standardHeaders: true, // Return rate limit info in the headers
    legacyHeaders: false, // Disable old headers
});

app.use(limiter); // Apply rate limiting to all requests

// Proxy rules
// Rule 1: Everything that starts with /auth...
app.use('/auth', createProxyMiddleware({
    target: AUTH_SERVICE_URL,  // ...send it to the authentication service
    changeOrigin: true,       
}));

// Rule 2: Everything that starts with /api...
app.use('/api', createProxyMiddleware({
    target: MESSAGE_SERVICE_URL, // ...send it to the message management service
    changeOrigin: true,
    ws: true, // Enable WebSocket proxying
}));

// Check if the gateway is running
app.get('/gateway/health', (req, res) => {
    res.status(200).send('API Gateway corriendo correctamente');
});

// START THE SERVER
app.listen(PORT, () => {
    console.log(`API Gateway corriendo en http://localhost:${PORT}`);
});