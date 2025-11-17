import { leaveRoom } from '../../services/roomService.js';
import { getRoomParticipantCount } from '../../services/roomService.js';
import { sessionCache, userNicknames, roomSockets } from '../socketHandler.js';

/**
 * Handle disconnect
 */
export async function handleDisconnect(socket) {
    const userInfo = userNicknames.get(socket.id);

    if (userInfo) {
        const { roomId, nickname, sessionId } = userInfo;

        // Leave room
        await leaveRoom(roomId, sessionId, nickname);

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
            hashedUsername: nickname,
            timestamp: Date.now(),
            participants: roomService.getRoomParticipantCount(roomId)
        });

        console.log(`[WS] Client disconnected: ${socket.id}, room: ${roomId}`);
    } else {
        console.log(`[WS] Client disconnected: ${socket.id}`);
    }
}