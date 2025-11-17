import { userNicknames } from '../socketHandler.js';

/**
 * Handle typing indicator
 * @param {Object} socket - Socket.io socket
 * @param {Object} data - Data from client {isTyping : boolean}
 */
export function handleTyping(socket, data) {
    const userInfo = userNicknames.get(socket.id);
    if (!userInfo) return;

    const { roomId, nickname } = userInfo;
    const { isTyping } = data;

    socket.to(roomId).emit('user-typing', {
        nickname: nickname,
        isTyping
    });
}