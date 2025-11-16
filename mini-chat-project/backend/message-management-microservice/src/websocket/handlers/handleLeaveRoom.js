import roomService from '../../services/roomService.js';
import encryptionService from '../../services/encryptionService.js';
import { sessionCache, userNicknames, roomSockets } from '../socketHandler.js';

/**
 * Handle leave room
 */
export async function handleLeaveRoom(socket, callback) {
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