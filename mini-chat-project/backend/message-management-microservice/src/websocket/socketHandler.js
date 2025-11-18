import { Server } from 'socket.io';
import NodeCache from 'node-cache';
import {
    handleJoinRoom,
    handleSendMessage,
    handleSendFile,
    handleTyping,
    handleDisconnect,
    handleLeaveRoom,
    handleHeartbeat,
    handleGetParticipants
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
export const ipConnections = new Map(); // ip -> { socketId, connectedAt, roomId }

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
        maxHttpBufferSize: config.maxFileSize,

        path: '/api/socket.io/'
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

/**
 * Get client IP address from socket
 * @param {Object} socket - Socket instance
 * @returns {string} Client IP address
 */
function getClientIP(socket) {
    // Try to get real IP from headers (in case of proxy/load balancer)
    const forwardedFor = socket.handshake.headers['x-forwarded-for'];
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }
    
    const realIP = socket.handshake.headers['x-real-ip'];
    if (realIP) {
        return realIP;
    }
    
    // Fallback to direct connection IP
    return socket.handshake.address;
}

/**
 * Check and enforce single connection per IP
 * @param {Object} socket - Socket instance
 * @returns {boolean} True if connection is allowed, false otherwise
 */
function enforceIPLimit(socket) {
    const clientIP = getClientIP(socket);
    
    if (ipConnections.has(clientIP)) {
        const existingConnection = ipConnections.get(clientIP);
        const existingSocket = io.sockets.sockets.get(existingConnection.socketId);
        
        // If existing socket is still connected, disconnect it
        if (existingSocket && existingSocket.connected) {
            console.log(`[WS] Disconnecting previous connection from IP ${clientIP} (socket: ${existingConnection.socketId})`);
            existingSocket.emit('force-disconnect', {
                reason: 'New connection from same device',
                message: 'Your session was ended because a new connection was established from this device'
            });
            existingSocket.disconnect(true);
        }
    }
    
    // Register new connection
    ipConnections.set(clientIP, {
        socketId: socket.id,
        connectedAt: new Date(),
        roomId: null
    });
    
    console.log(`[WS] IP ${clientIP} registered for socket ${socket.id}`);
    return true;
}

/**
 * Update room for IP connection
 * @param {string} socketId - Socket ID
 * @param {string} roomId - Room ID
 */
export function updateIPConnectionRoom(socketId, roomId) {
    for (const [ip, connection] of ipConnections.entries()) {
        if (connection.socketId === socketId) {
            connection.roomId = roomId;
            break;
        }
    }
}

/**
 * Clean up IP connection on disconnect
 * @param {string} socketId - Socket ID
 */
export function cleanupIPConnection(socketId) {
    for (const [ip, connection] of ipConnections.entries()) {
        if (connection.socketId === socketId) {
            console.log(`[WS] Removing IP ${ip} from connection cache`);
            ipConnections.delete(ip);
            break;
        }
    }
}

function setupHandlers() {
    io.on('connection', (socket) => {
        console.log(`[WS] Client connected: ${socket.id}`);
        
        // Enforce single connection per IP 
        // if (!enforceIPLimit(socket)) {
        //     socket.disconnect(true);
        //     return;
        // }

        socket.on('join-room', async (data, callback) => {
            await handleJoinRoom(socket, data, callback);
        });

        socket.on('get-participants', (data, callback) => {
            handleGetParticipants(socket, callback);
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
            cleanupIPConnection(socket.id);
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
