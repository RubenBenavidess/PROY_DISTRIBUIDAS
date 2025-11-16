import express from 'express';
import { createServer } from 'http';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import connect from './config/db.js';
import { initializeWebSocket } from './websocket/socketHandler.js';
import roomRoutes from './routes/roomRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import handleErrors from './middleware/errors/errorMiddleware.js';

dotenv.config();

// Configuration object
const config = {
    port: process.env.PORT || 3002,
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
    }
};

const app = express();
const httpServer = createServer(app);

// Security middleware
app.use(helmet());
app.use(cors({
    origin: config.corsOrigin,
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parser
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        service: 'message-management-microservice',
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Error handler
app.use(handleErrors);

// Initialize WebSocket
initializeWebSocket(httpServer);

// Connect to database and start server
const PORT = config.port;

connect()
    .then(() => {
        httpServer.listen(PORT, () => {
            console.log(`Message Management Microservice running on port ${PORT}`);
            console.log(`Environment: ${config.nodeEnv}`);
            console.log(`WebSocket server ready`);
            console.log(`Encryption enabled`);
        });
    })
    .catch((error) => {
        console.error('Failed to start server:', error);
        process.exit(1);
    });

export default app;
