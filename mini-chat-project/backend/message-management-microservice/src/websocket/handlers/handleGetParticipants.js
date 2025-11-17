import { roomSockets, userNicknames } from '../socketHandler.js';

/**
 * Handle request to get room participants
 * @param {Object} socket - Socket.io socket
 * @param {Function} callback - Callback to send response
 */
export function handleGetParticipants(socket, callback) {
    try {
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
            // Recorre el Set de sockets en esa sala
            for (const socketId of roomSockets.get(roomId)) {
                const user = userNicknames.get(socketId);
                if (user) {
                    participants.push({
                        hashedUsername: user.nickname, // El nickname ya está hasheado
                    });
                }
            }
        }

        callback({
            success: true,
            participants,
            count: participants.length
        });

    } catch (error) {
        console.error('[WS] Error getting participants:', error);
        callback({
            success: false,
            error: error.message
        });
    }
}