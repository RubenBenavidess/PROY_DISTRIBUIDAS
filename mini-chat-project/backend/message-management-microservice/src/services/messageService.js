import Message from '../models/Message.js';
import Room from '../models/Room.js';
import { verifyMessageIntegrity, verifyFile, sanitizeFile, detectContentType, healthCheck } from './fileVerificationClient.js';
import { putFromBuffer } from '../lib/s3put.js';
import { getSignedImageUrl } from '../lib/s3get.js';

/**
 * Check file verification service availability
 */
export async function checkFileVerificationService() {
    const isAvailable = await healthCheck();
    if (isAvailable) {
        console.log('File verification service is available');
    } else {
        console.warn('File verification service is not available. File uploads will be disabled.');
    }
}

/**
 * Save message to database
 * @param {Object} messageData - Message data {roomId, username, userIP, content}
 * @returns {Object} - Saved message info {messageId, timestamp}
 */
export async function saveMessage(messageData) {
    const { roomId, username, userIP, content } = messageData;

    const room = await Room.findOne({ roomId });
    if (!room) {
        throw new Error('Room not found');
    }

    if (!(await verifyMessageIntegrity(content)).isValid) {
        throw new Error('Message failed integrity verification');
    }

    const message = new Message({
        roomId,
        username,
        userIP,
        contentType: 'text',
        content: content
    });

    await message.save();

    return {
        messageId: message._id,
        timestamp: message.createdAt
    };
}

/**
 * Save multimedia message to database
 * @param {Object} messageData - Message data {roomId, username, userIP, content(fileBuffer), filename}
 * @returns {Object} - Saved message info {messageId, timestamp}
 */
export async function saveMultimediaMessage(messageData) {
    const { roomId, username, userIP, content, filename } = messageData;

    const room = await Room.findOne({ roomId });
    if (!room) {
        throw new Error('Room not found');
    }

    if(room.type === 'text'){
        throw new Error('Invalid content type for text room');
    }

    const contentType = await detectContentType(content);

    if(!(await verifyFile(content, contentType, filename)).isSafe){
        throw new Error('File failed security verification');
    }

    const sanitizedBuffer = await sanitizeFile(content, contentType, filename);

    const url = `messages/${roomId}/${Date.now()}_${filename}`;

    await putFromBuffer(sanitizedBuffer, url);

    const message = new Message({
        roomId,
        username,
        userIP,
        contentType,
        content: url
    });

    await message.save();

    return {
        messageId: message._id,
        timestamp: message.createdAt
    };
        
}

/**
 * Get latest messages for a room with pagination
 * @param {String} roomId - Room ID
 * @param {Object} options - Pagination options {limit, skip}
 * @returns {Array} - List of messages with signed URLs for multimedia content
 */
export async function getLatestMessages(roomId, options = {}) {
    try {
        const { limit = 50, skip = 0 } = options;

        const query = { roomId };

        const messages = await Message
            .find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip)
            .lean();

        // Generate signed URLs for non-text messages
        const messagesWithSignedUrls = await Promise.all(
            messages.map(async (message) => {
                // If contentType is not 'text', generate a signed URL
                if (message.contentType !== 'text') {
                    try {
                        const signedUrl = await getSignedImageUrl(message.content);
                        return {
                            ...message,
                            content: signedUrl
                        };
                    } catch (error) {
                        console.error(`Error generating signed URL for message ${message._id}:`, error);
                        // Return message with original content if URL generation fails
                        return message;
                    }
                }
                return message;
            })
        );

        return messagesWithSignedUrls;
    } catch (error) {
        console.error('Error retrieving messages:', error);
        throw error;
    }
}

