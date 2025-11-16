import encryptionService from '../../services/encryptionService.js';
import { userNicknames } from '../socketHandler.js';

/**
 * Handle typing indicator
 */
export function handleTyping(socket, data) {
    const userInfo = userNicknames.get(socket.id);
    if (!userInfo) return;

    const { roomId, nickname } = userInfo;
    const { isTyping } = data;

    socket.to(roomId).emit('user-typing', {
        hashedUsername: encryptionService.hashUsername(nickname, roomId),
        isTyping
    });
}