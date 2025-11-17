import roomService from '../../services/roomService.js';
import { saveMultimediaMessage } from '../../services/messageService.js';
import { userNicknames } from '../socketHandler.js';

/**
 * Validate file data
 * @param {Object} data - File data
 * @returns {Object} Validation result {valid: boolean, error?: string}
 */
function validateFileData(data) {
    const { fileBuffer, filename } = data;

    if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
        return { valid: false, error: 'Invalid file buffer' };
    }

    if (!filename || typeof filename !== 'string') {
        return { valid: false, error: 'Filename is required' };
    }

    if (filename.trim().length === 0) {
        return { valid: false, error: 'Filename cannot be empty' };
    }

    return { valid: true };
}

/**
 * Validate room supports media
 * @param {Object} room - Room info
 * @returns {Object} Validation result {valid: boolean, error?: string}
 */
function validateRoomSupportsMedia(room) {
    if (room.type !== 'text/media') {
        return { valid: false, error: 'Room does not support file uploads' };
    }
    return { valid: true };
}

/**
 * Validate file size
 * @param {Buffer} fileBuffer - File buffer
 * @param {number} maxSizeMB - Maximum size in MB
 * @returns {Object} Validation result {valid: boolean, error?: string}
 */
function validateFileSize(fileBuffer, maxSizeMB) {
    const fileSizeInBytes = fileBuffer.length;
    const maxSizeInBytes = maxSizeMB * 1024 * 1024;

    if (fileSizeInBytes > maxSizeInBytes) {
        return { 
            valid: false, 
            error: `File too large. Maximum size is ${maxSizeMB}MB` 
        };
    }

    return { valid: true };
}

/**
 * Build file data for broadcasting
 * @param {string} messageId - Message ID
 * @param {string} hashedNickname - Hashed nickname
 * @param {string} filename - Original filename
 * @param {string} contentType - Content type detected
 * @param {Date} timestamp - Message timestamp
 * @returns {Object} File data object
 */
function buildFileData(messageId, hashedNickname, filename, contentType, timestamp) {
    return {
        id: messageId,
        username: hashedNickname,
        filename,
        contentType,
        timestamp
    };
}

/**
 * Broadcast file to room
 * @param {Object} io - Socket.IO server instance
 * @param {string} roomId - Room ID
 * @param {Object} fileData - File data to broadcast
 */
function broadcastFile(io, roomId, fileData) {
    io.to(roomId).emit('new-file', fileData);
}

/**
 * Handle file upload
 * @param {Object} socket - Socket.io socket
 * @param {Object} data - Data from client {fileBuffer, mimeType, filename}
 * @param {Function} callback - Callback to send response
 * @param {Object} io - Socket.IO server instance
 */
export async function handleSendFile(socket, data, callback, io) {
    try {
        // Get user info
        const userInfo = userNicknames.get(socket.id);

        if (!userInfo) {
            return callback({
                success: false,
                error: 'Not in a room'
            });
        }

        const { fileBuffer, filename } = data;
        const { roomId, nickname } = userInfo;

        // Validate file data
        const fileValidation = validateFileData(data);
        if (!fileValidation.valid) {
            return callback({
                success: false,
                error: fileValidation.error
            });
        }

        // Get room info
        const room = await roomService.getRoomInfo(roomId);

        // Check if room allows media
        const mediaValidation = validateRoomSupportsMedia(room);
        if (!mediaValidation.valid) {
            return callback({
                success: false,
                error: mediaValidation.error
            });
        }

        // Validate file size
        const sizeValidation = validateFileSize(fileBuffer, room.contentSizeLimit);
        if (!sizeValidation.valid) {
            return callback({
                success: false,
                error: sizeValidation.error
            });
        }

        // Get user IP
        const userIP = socket.handshake.address;

        // Save multimedia message (includes security verification - will throw error if unsafe)
        const result = await saveMultimediaMessage({ 
            roomId, 
            username: nickname, 
            userIP, 
            content: fileBuffer, 
            filename 
        });

        // Build file data
        const fileData = buildFileData(
            result.messageId,
            nickname,
            filename,
            'file', // Could be enhanced to get actual content type from result
            result.timestamp
        );

        // Broadcast to all users in room
        broadcastFile(io, roomId, fileData);

        // Audit log
        console.log(`[AUDIT] File sent: room=${roomId}, user=${nickname}, messageId=${result.messageId}`);

        callback({
            success: true,
            messageId: result.messageId,
            timestamp: result.timestamp
        });

    } catch (error) {
        console.error('[WS] Error sending file:', error);
        callback({
            success: false,
            error: error.message
        });
    }
}