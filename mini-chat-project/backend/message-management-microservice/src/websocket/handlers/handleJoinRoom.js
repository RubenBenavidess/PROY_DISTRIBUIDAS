import roomService from '../../services/roomService.js';
import messageService from '../../services/messageService.js';
import encryptionService from '../../services/encryptionService.js';
import { sessionCache, userNicknames, roomSockets } from '../socketHandler.js';

/**
 * Handle room join
 * @param {Object} socket - Socket.io socket
 * @param {Object} data - Data from client {roomId, pin, nickname}
 * @param {Function} callback - Callback to send response
*/
export async function handleJoinRoom(socket, data, callback) {
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