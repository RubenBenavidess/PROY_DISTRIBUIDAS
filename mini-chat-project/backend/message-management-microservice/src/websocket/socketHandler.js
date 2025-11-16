import { Server } from 'socket.io';
import messageService from '../services/messageService.js';
import roomService from '../services/roomService.js';
import encryptionService from '../services/encryptionService.js';
import { config } from '../config/index.js';
import NodeCache from 'node-cache';

// Cache for session management
const sessionCache = new NodeCache({ stdTTL: config.sessionTimeout / 1000 });
const userNicknames = new Map(); // socketId -> { roomId, nickname }
const roomSockets = new Map(); // roomId -> Set of socket IDs

class WebSocketHandler {
    constructor(httpServer) {
        this.io = new Server(httpServer, {
            cors: {
                origin: config.corsOrigin,
                methods: ['GET', 'POST'],
                credentials: true
            },
            pingTimeout: config.websocket.pingTimeout,
            pingInterval: config.websocket.pingInterval,
            maxHttpBufferSize: config.maxFileSize
        });

        this.setupHandlers();
    }

    setupHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`[WS] Client connected: ${socket.id}`);

            // Authentication & Join Room
            socket.on('join-room', async (data, callback) => {
                await this.handleJoinRoom(socket, data, callback);
            });

            // Send Message
            socket.on('send-message', async (data, callback) => {
                await this.handleSendMessage(socket, data, callback);
            });

            // Send File
            socket.on('send-file', async (data, callback) => {
                await this.handleSendFile(socket, data, callback);
            });

            // Typing indicator
            socket.on('typing', (data) => {
                this.handleTyping(socket, data);
            });

            // Get room participants
            socket.on('get-participants', (data, callback) => {
                this.handleGetParticipants(socket, data, callback);
            });

            // Disconnect
            socket.on('disconnect', () => {
                this.handleDisconnect(socket);
            });

            // Leave room manually
            socket.on('leave-room', async (callback) => {
                await this.handleLeaveRoom(socket, callback);
            });

            // Heartbeat for session management
            socket.on('heartbeat', () => {
                this.handleHeartbeat(socket);
            });
        });
    }

    /**
     * Handle room join
     */
    async handleJoinRoom(socket, data, callback) {
        try {
            const { roomId, pin, nickname } = data;

            if (!roomId || !pin || !nickname) {
                return callback({
                    success: false,
                    error: 'Missing required fields'
                });
            }

            // Validate nickname
            if (nickname.length < 3 || nickname.length > 20) {
                return callback({
                    success: false,
                    error: 'Nickname must be between 3 and 20 characters'
                });
            }

            // Check if user already in a room
            if (userNicknames.has(socket.id)) {
                return callback({
                    success: false,
                    error: 'Already in a room. Leave current room first.'
                });
            }

            // Generate session ID
            const sessionId = encryptionService.generateSessionToken();

            // Join room
            const result = await roomService.joinRoom(roomId, pin, nickname, sessionId);

            if (!result.success) {
                return callback({
                    success: false,
                    error: result.error
                });
            }

            // Store session
            sessionCache.set(sessionId, {
                socketId: socket.id,
                roomId,
                nickname,
                joinedAt: Date.now()
            });

            // Store user info
            userNicknames.set(socket.id, { roomId, nickname, sessionId });

            // Add to room sockets
            if (!roomSockets.has(roomId)) {
                roomSockets.set(roomId, new Set());
            }
            roomSockets.get(roomId).add(socket.id);

            // Join socket.io room
            socket.join(roomId);

            // Get recent messages
            const messages = await messageService.getMessages(roomId, { limit: 50 });

            // Notify others
            socket.to(roomId).emit('user-joined', {
                nickname: encryptionService.hashUsername(nickname, roomId),
                timestamp: Date.now(),
                participants: result.currentParticipants
            });

            // Log for audit
            console.log(`[AUDIT] User joined via WebSocket: room=${roomId}, nickname=${nickname}, socket=${socket.id}`);

            callback({
                success: true,
                sessionId,
                roomInfo: {
                    roomId,
                    type: result.roomType,
                    participants: result.currentParticipants,
                    sizeLimit: result.sizeLimit,
                    contentSizeLimit: result.contentSizeLimit
                },
                messages
            });

        } catch (error) {
            console.error('[WS] Error joining room:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Handle message send
     */
    async handleSendMessage(socket, data, callback) {
        try {
            const userInfo = userNicknames.get(socket.id);

            if (!userInfo) {
                return callback({
                    success: false,
                    error: 'Not in a room'
                });
            }

            const { content } = data;
            const { roomId, nickname } = userInfo;

            // Validate message
            messageService.validateMessage(content, 'text');

            // Get user IP
            const userIP = socket.handshake.address;

            // Save message
            const result = await messageService.saveMessage({
                roomId,
                username: nickname,
                userIP,
                contentType: 'text',
                content
            });

            // Create message signature for integrity
            const signature = encryptionService.signMessage({
                content,
                roomId,
                username: nickname,
                timestamp: result.timestamp
            });

            // Broadcast to room
            const messageData = {
                id: result.messageId,
                username: nickname,
                hashedUsername: encryptionService.hashUsername(nickname, roomId),
                content,
                contentType: 'text',
                timestamp: result.timestamp,
                signature
            };

            this.io.to(roomId).emit('new-message', messageData);

            // Log for audit
            console.log(`[AUDIT] Message sent: room=${roomId}, user=${nickname}, messageId=${result.messageId}`);

            callback({
                success: true,
                messageId: result.messageId,
                timestamp: result.timestamp
            });

        } catch (error) {
            console.error('[WS] Error sending message:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Handle file upload
     */
    async handleSendFile(socket, data, callback) {
        try {
            const userInfo = userNicknames.get(socket.id);

            if (!userInfo) {
                return callback({
                    success: false,
                    error: 'Not in a room'
                });
            }

            const { fileBuffer, mimeType, filename } = data;
            const { roomId, nickname } = userInfo;

            // Get room info
            const room = await roomService.getRoomInfo(roomId);

            // Check if room allows media
            if (room.type !== 'text/media') {
                return callback({
                    success: false,
                    error: 'Room does not support file uploads'
                });
            }

            // Validate file size
            if (fileBuffer.length > room.contentSizeLimit * 1024 * 1024) {
                return callback({
                    success: false,
                    error: `File too large. Maximum size is ${room.contentSizeLimit}MB`
                });
            }

            const userIP = socket.handshake.address;

            // Process file (delegates to file-verification-microservice)
            const result = await messageService.processFileUpload(
                Buffer.from(fileBuffer),
                mimeType,
                filename,
                roomId,
                nickname,
                userIP
            );

            // Broadcast file to room
            const fileData = {
                username: nickname,
                hashedUsername: encryptionService.hashUsername(nickname, roomId),
                contentType: messageService.getContentTypeFromMime(mimeType),
                filename: filename,
                hash: result.hash,
                signature: result.signature,
                size: result.size,
                verified: result.verified,
                timestamp: result.timestamp
            };

            this.io.to(roomId).emit('new-file', fileData);

            // Log for audit
            console.log(`[AUDIT] File sent: room=${roomId}, user=${nickname}, hash=${result.hash}`);

            callback({
                success: true,
                hash: result.hash,
                timestamp: result.timestamp
            });

        } catch (error) {
            console.error('[WS] Error sending file:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Handle typing indicator
     */
    handleTyping(socket, data) {
        const userInfo = userNicknames.get(socket.id);
        if (!userInfo) return;

        const { roomId, nickname } = userInfo;
        const { isTyping } = data;

        socket.to(roomId).emit('user-typing', {
            hashedUsername: encryptionService.hashUsername(nickname, roomId),
            isTyping
        });
    }

    /**
     * Get room participants
     */
    handleGetParticipants(socket, data, callback) {
        const userInfo = userNicknames.get(socket.id);
        if (!userInfo) {
            return callback({
                success: false,
                error: 'Not in a room'
            });
        }

        const { roomId } = userInfo;
        const participants = [];

        if (roomSockets.has(roomId)) {
            for (const socketId of roomSockets.get(roomId)) {
                const user = userNicknames.get(socketId);
                if (user) {
                    participants.push({
                        hashedUsername: encryptionService.hashUsername(user.nickname, roomId),
                        online: true
                    });
                }
            }
        }

        callback({
            success: true,
            participants,
            count: participants.length
        });
    }

    /**
     * Handle disconnect
     */
    async handleDisconnect(socket) {
        const userInfo = userNicknames.get(socket.id);

        if (userInfo) {
            const { roomId, nickname, sessionId } = userInfo;

            // Leave room
            await roomService.leaveRoom(roomId, sessionId, nickname);

            // Remove from tracking
            userNicknames.delete(socket.id);
            sessionCache.del(sessionId);

            if (roomSockets.has(roomId)) {
                roomSockets.get(roomId).delete(socket.id);
                if (roomSockets.get(roomId).size === 0) {
                    roomSockets.delete(roomId);
                }
            }

            // Notify others
            socket.to(roomId).emit('user-left', {
                hashedUsername: encryptionService.hashUsername(nickname, roomId),
                timestamp: Date.now(),
                participants: roomService.getRoomParticipantCount(roomId)
            });

            console.log(`[WS] Client disconnected: ${socket.id}, room: ${roomId}`);
        } else {
            console.log(`[WS] Client disconnected: ${socket.id}`);
        }
    }

    /**
     * Handle leave room
     */
    async handleLeaveRoom(socket, callback) {
        const userInfo = userNicknames.get(socket.id);

        if (!userInfo) {
            return callback({
                success: false,
                error: 'Not in a room'
            });
        }

        const { roomId, nickname, sessionId } = userInfo;

        // Leave room
        await roomService.leaveRoom(roomId, sessionId, nickname);

        // Remove from tracking
        userNicknames.delete(socket.id);
        sessionCache.del(sessionId);

        if (roomSockets.has(roomId)) {
            roomSockets.get(roomId).delete(socket.id);
        }

        // Leave socket.io room
        socket.leave(roomId);

        // Notify others
        socket.to(roomId).emit('user-left', {
            hashedUsername: encryptionService.hashUsername(nickname, roomId),
            timestamp: Date.now()
        });

        callback({
            success: true
        });
    }

    /**
     * Handle heartbeat
     */
    handleHeartbeat(socket) {
        const userInfo = userNicknames.get(socket.id);
        if (userInfo && userInfo.sessionId) {
            sessionCache.ttl(userInfo.sessionId, config.sessionTimeout / 1000);
        }
    }
}

export default WebSocketHandler;
