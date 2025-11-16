import messageService from '../../services/messageService.js';
import encryptionService from '../../services/encryptionService.js';
import { userNicknames } from '../socketHandler.js';

/**
 * Handle message send
 */
export async function handleSendMessage(socket, data, callback, io) {
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

        io.to(roomId).emit('new-message', messageData);

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