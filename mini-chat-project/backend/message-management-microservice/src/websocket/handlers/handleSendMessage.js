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
 * @param {string} signature - Digital signature (optional)
 * @param {string} publicKey - Public RSA key (optional)
 * @returns {Object} Message data object
 */
function buildMessageData(messageId, hashedNickname, content, timestamp, signature = null, publicKey = null) {
    const messageData = {
        id: messageId,
        username: hashedNickname,
        content, // Contenido encriptado (E2EE - servidor nunca lo desencripta)
        contentType: 'text',
        timestamp
    };

    // Agregar firma y clave pública si están presentes (para verificación E2EE)
    if (signature) messageData.signature = signature;
    if (publicKey) messageData.publicKey = publicKey;

    return messageData;
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
 * @param {Object} data - Data from client {content, signature?, publicKey?}
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

        const { content, signature, publicKey } = data;
        const { roomId, nickname } = userInfo;

        // 🐛 DEBUG: Log datos recibidos
        console.log('[DEBUG] Mensaje recibido:', {
            contentLength: content?.length,
            hasSignature: !!signature,
            hasPublicKey: !!publicKey,
            roomId,
            nickname
        });

        // Validate message content (encrypted)
        const validation = validateMessageContent(content);
        if (!validation.valid) {
            return callback({
                success: false,
                error: validation.error
            });
        }

        // Get user IP
        const userIP = socket.handshake.address;

        // Save message to database (content is encrypted - E2EE)
        // ⚠️ IMPORTANTE: El servidor NUNCA desencripta el contenido
        console.log('[DEBUG] Guardando mensaje en BD...');
        const result = await saveMessage({
            roomId,
            username: nickname,
            userIP,
            content // Contenido encriptado
        });
        console.log('[DEBUG] Mensaje guardado con ID:', result.messageId);

        // Build message data (incluye firma y clave pública para E2EE)
        const messageData = buildMessageData(
            result.messageId,
            nickname,
            content,
            result.timestamp,
            signature,
            publicKey
        );

        // Broadcast to all users in room (mensaje encriptado + firma)
        broadcastMessage(io, roomId, messageData);

        // Audit log
        console.log(`[AUDIT] 🔒 Encrypted message sent: room=${roomId}, hashedNickname=${nickname}, messageId=${result.messageId}, signed=${!!signature}`);

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