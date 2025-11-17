import roomService from '../../services/roomService.js';
import { sessionCache, userNicknames, roomSockets } from '../socketHandler.js';

/**
 * Clear user session data
 * @param {string} socketId - Socket ID
 * @param {string} sessionId - Session ID
 */
function clearUserSession(socketId, sessionId) {
    userNicknames.delete(socketId);
    sessionCache.del(sessionId);
}

/**
 * Remove socket from room tracking
 * @param {string} roomId - Room ID
 * @param {string} socketId - Socket ID
 */
function removeSocketFromRoom(roomId, socketId) {
    if (roomSockets.has(roomId)) {
        roomSockets.get(roomId).delete(socketId);
        
        // Clean up empty room
        if (roomSockets.get(roomId).size === 0) {
            roomSockets.delete(roomId);
        }
    }
}

/**
 * Notify other users that someone left
 * @param {Object} socket - Socket instance
 * @param {string} roomId - Room ID
 * @param {string} hashedNickname - Hashed nickname (already hashed)
 */
function notifyUserLeft(socket, roomId, hashedNickname) {
    socket.to(roomId).emit('user-left', {
        nickname: hashedNickname,
        timestamp: Date.now()
    });
}

/**
 * Handle leave room
 * @param {Object} socket - Socket.io socket
 * @param {Function} callback - Callback to send response
 */
export async function handleLeaveRoom(socket, callback) {
    try {
        // Get user info
        const userInfo = userNicknames.get(socket.id);

        if (!userInfo) {
            return callback({
                success: false,
                error: 'Not in a room'
            });
        }

        const { roomId, nickname, sessionId } = userInfo;

        // Leave room in service layer
        await roomService.leaveRoom(roomId, sessionId, nickname);

        // Clear session data
        clearUserSession(socket.id, sessionId);

        // Remove from room tracking
        removeSocketFromRoom(roomId, socket.id);

        // Leave socket.io room
        socket.leave(roomId);

        // Notify other participants
        notifyUserLeft(socket, roomId, nickname);

        // Audit log
        console.log(`[AUDIT] User left room: room=${roomId}, hashedNickname=${nickname}, socket=${socket.id}`);

        callback({
            success: true
        });

    } catch (error) {
        console.error('[WS] Error leaving room:', error);
        callback({
            success: false,
            error: error.message
        });
    }
}