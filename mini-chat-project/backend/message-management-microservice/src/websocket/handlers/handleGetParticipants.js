import encryptionService from '../../services/encryptionService.js';
import { userNicknames, roomSockets } from '../socketHandler.js';

/**
 * Get room participants
 */
export function handleGetParticipants(socket, data, callback) {
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