import crypto from 'crypto';
import { joinRoom } from '../../services/roomService.js';
import { getLatestMessages } from '../../services/messageService.js';
import { sessionCache, userNicknames, roomSockets } from '../socketHandler.js';

/**
 * Generate deterministic hash for username in a specific room
 * @param {string} nickname - User's nickname
 * @param {string} roomId - Room ID
 * @returns {string} Deterministic hash
 */
function hashNicknameForRoom(nickname, roomId) {
    const combined = `${nickname}:${roomId}`;
    return crypto.createHash('sha256').update(combined).digest('hex').substring(0, 16);
}

/**
 * Generate a unique session token
 * @returns {string} Session token
 */
function generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate join request data
 * @param {Object} data - Request data
 * @returns {Object} Validation result {valid: boolean, error?: string}
 */
function validateJoinRequest(data) {
    const { roomId, pin, nickname } = data;

    if (!roomId || !pin || !nickname) {
        return { valid: false, error: 'Missing required fields' };
    }

    if (nickname.length < 3 || nickname.length > 20) {
        return { valid: false, error: 'Nickname must be between 3 and 20 characters' };
    }

    return { valid: true };
}

/**
 * Store user session data
 * @param {string} sessionId - Session ID
 * @param {string} socketId - Socket ID
 * @param {string} roomId - Room ID
 * @param {string} hashedNickname - Hashed nickname
 */
function storeUserSession(sessionId, socketId, roomId, hashedNickname) {
    sessionCache.set(sessionId, {
        socketId,
        roomId,
        nickname: hashedNickname,
        joinedAt: Date.now()
    });

    userNicknames.set(socketId, { roomId, nickname: hashedNickname, sessionId });
}

/**
 * Add socket to room tracking
 * @param {string} roomId - Room ID
 * @param {string} socketId - Socket ID
 */
function addSocketToRoom(roomId, socketId) {
    if (!roomSockets.has(roomId)) {
        roomSockets.set(roomId, new Set());
    }
    roomSockets.get(roomId).add(socketId);
}

/**
 * Notify other users in the room about new participant
 * @param {Object} socket - Socket instance
 * @param {string} roomId - Room ID
 * @param {string} hashedNickname - Hashed nickname
 * @param {number} participantCount - Current participant count
 */
function notifyRoomParticipants(socket, roomId, hashedNickname, participantCount) {
    socket.to(roomId).emit('user-joined', {
        nickname: hashedNickname,
        timestamp: Date.now(),
        participants: participantCount
    });
}

/**
 * Build successful join response
 * @param {string} sessionId - Session ID
 * @param {Object} roomResult - Room join result
 * @param {Array} messages - Recent messages
 * @returns {Object} Success response
 */
function buildSuccessResponse(sessionId, roomResult, messages) {
    return {
        success: true,
        sessionId,
        roomInfo: {
            roomId: roomResult.roomId,
            type: roomResult.roomType,
            participants: roomResult.currentParticipants,
            sizeLimit: roomResult.sizeLimit,
            contentSizeLimit: roomResult.contentSizeLimit
        },
        messages
    };
}

/**
 * Handle room join
 * @param {Object} socket - Socket.io socket
 * @param {Object} data - Data from client {roomId, pin, nickname}
 * @param {Function} callback - Callback to send response
 */
export async function handleJoinRoom(socket, data, callback) {
    try {
        // Validate request
        const validation = validateJoinRequest(data);
        if (!validation.valid) {
            return callback({
                success: false,
                error: validation.error
            });
        }

        const { roomId, pin, nickname } = data;

        // Check if user already in a room
        if (userNicknames.has(socket.id)) {
            return callback({
                success: false,
                error: 'Already in a room. Leave current room first.'
            });
        }

        // Hash nickname deterministically for this room
        const hashedNickname = hashNicknameForRoom(nickname, roomId);

        // Generate session token
        const sessionId = generateSessionToken();

        // Attempt to join room
        const roomResult = await joinRoom({ roomId, pin }, { nickname: hashedNickname, sessionId });

        if (!roomResult.success) {
            return callback({
                success: false,
                error: roomResult.error
            });
        }

        // Store session data
        storeUserSession(sessionId, socket.id, roomId, hashedNickname);

        // Track socket in room
        addSocketToRoom(roomId, socket.id);

        // Join socket.io room
        socket.join(roomId);

        // Fetch recent messages
        const messages =  await getLatestMessages(roomId, { limit: 50 });

        // Notify other participants
        notifyRoomParticipants(socket, roomId, hashedNickname, roomResult.currentParticipants);

        // Audit log
        console.log(`[AUDIT] User joined via WebSocket: room=${roomId}, hashedNickname=${hashedNickname}, socket=${socket.id}`);

        // Send success response
        callback(buildSuccessResponse(sessionId, roomResult, messages));

    } catch (error) {
        console.error('[WS] Error joining room:', error);
        callback({
            success: false,
            error: error.message
        });
    }
}