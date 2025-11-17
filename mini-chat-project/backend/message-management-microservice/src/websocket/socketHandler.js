import { Server } from 'socket.io';
import NodeCache from 'node-cache';
import {
    handleJoinRoom,
    handleSendMessage,
    handleSendFile,
    handleTyping,
    handleDisconnect,
    handleLeaveRoom,
    handleHeartbeat
} from './handlers/index.js';

const config = {
    corsOrigin: process.env.CORS_ORIGIN,
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 3600000,
    websocket: {
        pingTimeout: parseInt(process.env.WS_PING_TIMEOUT) || 30000,
        pingInterval: parseInt(process.env.WS_PING_INTERVAL) || 25000
    },
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760
};

// Cache for session management
export const sessionCache = new NodeCache({ stdTTL: config.sessionTimeout / 1000 });
export const userNicknames = new Map(); // socketId -> { roomId, nickname }
export const roomSockets = new Map(); // roomId -> Set of socket IDs

let io;

/**
 * Initialize WebSocket server
 * @param {Object} httpServer - HTTP server instance
 * @returns {Object} Socket.IO server instance
 */
export function initializeWebSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: config.corsOrigin,
            methods: ['GET', 'POST'],
            credentials: true
        },
        pingTimeout: config.websocket.pingTimeout,
        pingInterval: config.websocket.pingInterval,
        maxHttpBufferSize: config.maxFileSize
    });

    setupHandlers();
    
    return io;
}

/**
 * Get Socket.IO server instance
 * @returns {Object} Socket.IO server instance
 */
export function getIO() {
    if (!io) {
        throw new Error('Socket.IO not initialized. Call initializeWebSocket first.');
    }
    return io;
}

function setupHandlers() {
    io.on('connection', (socket) => {
        console.log(`[WS] Client connected: ${socket.id}`);

        socket.on('join-room', async (data, callback) => {
            await handleJoinRoom(socket, data, callback);
        });

        socket.on('send-message', async (data, callback) => {
            await handleSendMessage(socket, data, callback, io);
        });

        socket.on('send-file', async (data, callback) => {
            await handleSendFile(socket, data, callback, io);
        });

        socket.on('typing', (data) => {
            handleTyping(socket, data);
        });

        socket.on('disconnect', () => {
            handleDisconnect(socket);
        });

        socket.on('leave-room', async (callback) => {
            await handleLeaveRoom(socket, callback);
        });

        socket.on('heartbeat', () => {
            handleHeartbeat(socket);
        });
    });
}
