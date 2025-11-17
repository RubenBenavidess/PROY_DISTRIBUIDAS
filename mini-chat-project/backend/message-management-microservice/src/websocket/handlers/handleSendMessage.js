import { saveMessage } from '../../services/messageService.js';
import { userNicknames } from '../socketHandler.js';

/**
 * Validate message content
 * @param {string} content - Message content
 * @returns {Object} Validation result {valid: boolean, error?: string}
 */
function validateMessageContent(content) {
    if (!content || typeof content !== 'string') {
        return { valid: false, error: 'Message content is required' };
    }

    if (content.trim().length === 0) {
        return { valid: false, error: 'Message cannot be empty' };
    }

    return { valid: true };
}

/**
 * Build message data for broadcasting
 * @param {string} messageId - Message ID
 * @param {string} hashedNickname - Hashed nickname
 * @param {string} content - Message content (encrypted from client)
 * @param {Date} timestamp - Message timestamp
 * @returns {Object} Message data object
 */
function buildMessageData(messageId, hashedNickname, content, timestamp) {
    return {
        id: messageId,
        username: hashedNickname,
        content,
        contentType: 'text',
        timestamp
    };
}

/**
 * Broadcast message to room
 * @param {Object} io - Socket.IO server instance
 * @param {string} roomId - Room ID
 * @param {Object} messageData - Message data to broadcast
 */
function broadcastMessage(io, roomId, messageData) {
    io.to(roomId).emit('new-message', messageData);
}

/**
 * Handle message send
 * @param {Object} socket - Socket.io socket
 * @param {Object} data - Data from client {content}
 * @param {Function} callback - Callback to send response
 * @param {Object} io - Socket.IO server instance
 */
export async function handleSendMessage(socket, data, callback, io) {
    try {
        // Get user info
        const userInfo = userNicknames.get(socket.id);

        if (!userInfo) {
            return callback({
                success: false,
                error: 'Not in a room'
            });
        }

        const { content } = data;
        const { roomId, nickname } = userInfo;

        // Validate message content
        const validation = validateMessageContent(content);
        if (!validation.valid) {
            return callback({
                success: false,
                error: validation.error
            });
        }

        // Get user IP
        const userIP = socket.handshake.address;

        // Save message to database (content comes encrypted from client)
        const result = await saveMessage({
            roomId,
            username: nickname,
            userIP,
            content
        });

        // Build message data
        const messageData = buildMessageData(
            result.messageId,
            nickname,
            content,
            result.timestamp
        );

        // Broadcast to all users in room
        broadcastMessage(io, roomId, messageData);

        // Audit log
        console.log(`[AUDIT] Message sent: room=${roomId}, hashedNickname=${nickname}, messageId=${result.messageId}`);

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