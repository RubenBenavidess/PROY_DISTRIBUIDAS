import Message from '../models/Message.js';
import Room from '../models/Room.js';

/**
 * Save message to database (E2EE)
 * Content is already encrypted on client side - server just stores it
 * @param {Object} messageData - Message data {roomId, username, userIP, content, signature, publicKey}
 * @returns {Object} - Saved message info {messageId, timestamp}
 */
export async function saveMessage(messageData) {
    const { roomId, username, userIP, content, signature, publicKey } = messageData;

    const room = await Room.findOne({ roomId });
    if (!room) {
        throw new Error('Room not found');
    }

    // Content is already encrypted (E2EE) - no validation needed server-side
    const message = new Message({
        roomId,
        username,
        userIP,
        contentType: 'text',
        content: content, // Encrypted Base64 string
        signature,        // RSA signature for verification
        publicKey         // Public key for signature verification
    });

    await message.save();

    // Log the message event non-blocking
    try {
        await sendLogToMicroservice({
            actorId: username,
            eventType: 'MESSAGE_SENT',
            details: { roomId, messageId: message._id.toString(), contentType: 'text' }
        });
    } catch (err) {
        console.error('Failed to log message event:', err.message);
    }

    return {
        messageId: message._id,
        timestamp: message.createdAt
    };
}

/**
 * Save multimedia message to database (LEGACY - deprecated in favor of E2EE)
 * This function is kept for backward compatibility but should not be used
 * All new files should use saveEncryptedFileMessage instead
 */
export async function saveMultimediaMessage(messageData) {
    throw new Error('DEPRECATED: Use saveEncryptedFileMessage for E2EE file uploads');
}

/**
 * Save encrypted file message to database (E2EE)
 * The server NEVER decrypts the file - it stores and relays encrypted content
 * @param {Object} messageData - Message data {roomId, username, userIP, encryptedContent, mimeType, filename, signature, publicKey}
 * @returns {Object} - Saved message info {messageId, timestamp}
 */
export async function saveEncryptedFileMessage(messageData) {
    const { roomId, username, userIP, encryptedContent, mimeType, filename, signature, publicKey } = messageData;

    const room = await Room.findOne({ roomId });
    if (!room) {
        throw new Error('Room not found');
    }

    if (room.type === 'text') {
        throw new Error('Invalid content type for text room');
    }

    // Store encrypted file content directly in the database
    // The server CANNOT and DOES NOT decrypt this content
    const message = new Message({
        roomId,
        username,
        userIP,
        contentType: mimeType || 'application/octet-stream',
        content: encryptedContent, // Store encrypted Base64 string
        filename,
        signature, // Store signature for verification
        publicKey  // Store public key for verification
    });

    await message.save();

    console.log(`[E2EE] Encrypted file stored: messageId=${message._id}, filename=${filename}`);

    return {
        messageId: message._id,
        timestamp: message.createdAt
    };
}

/**
 * Get latest messages for a room with pagination
 * @param {String} roomId - Room ID
 * @param {Object} options - Pagination options {limit, skip}
 * @returns {Array} - List of messages (encrypted files returned as-is for E2EE)
 */
export async function getLatestMessages(roomId, options = {}) {
    try {
        const { limit = 50, skip = 0 } = options;

        const query = { roomId };

        const messages = await Message
            .find(query)
            .sort({ createdAt: 1 }) // 1 = ascendente (más antiguos primero)
            .limit(limit)
            .skip(skip)
            .lean();

        // For E2EE files, return encrypted content as-is
        // Clients will decrypt locally with their AES key
        const processedMessages = messages.map((message) => {
            // If message has signature and publicKey, it's an E2EE file
            if (message.signature && message.publicKey) {
                // Return encrypted content directly (no URL generation)
                return {
                    ...message,
                    // content already contains encrypted Base64 string
                };
            }
            
            // For legacy non-encrypted files or text messages
            // (kept for backward compatibility if needed)
            return message;
        });

        return processedMessages;
    } catch (error) {
        console.error('Error retrieving messages:', error);
        throw error;
    }
}

