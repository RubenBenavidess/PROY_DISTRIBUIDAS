import { getRoomInfo } from '../../services/roomService.js';
import { saveEncryptedFileMessage } from '../../services/messageService.js';
import { userNicknames } from '../socketHandler.js';

/**
 * Validate file data
 * @param {Object} data - File data
 * @returns {Object} Validation result {valid: boolean, error?: string}
 */
function validateFileData(data) {
    const { encryptedFile, filename } = data;

    if (!encryptedFile || typeof encryptedFile !== 'string') {
        return { valid: false, error: 'Invalid encrypted file data' };
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
 * Validate file size (encrypted file in Base64)
 * @param {string} encryptedFileBase64 - Encrypted file in Base64
 * @param {number} maxSizeMB - Maximum size in MB
 * @returns {Object} Validation result {valid: boolean, error?: string}
 */
function validateFileSize(encryptedFileBase64, maxSizeMB) {
    // Estimate original size from Base64 (Base64 is ~33% larger)
    const base64Length = encryptedFileBase64.length;
    const estimatedBytes = (base64Length * 3) / 4;
    const maxSizeInBytes = maxSizeMB * 1024 * 1024;

    if (estimatedBytes > maxSizeInBytes) {
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
 * @param {string} mimeType - MIME type of the original file
 * @param {string} encryptedContent - Encrypted file content (Base64)
 * @param {string} signature - Digital signature (Base64)
 * @param {string} publicKey - Public RSA key (Base64)
 * @param {Date} timestamp - Message timestamp
 * @returns {Object} File data object
 */
function buildFileData(messageId, hashedNickname, filename, mimeType, encryptedContent, signature, publicKey, timestamp) {
    return {
        id: messageId,
        username: hashedNickname,
        filename,
        contentType: mimeType,
        content: encryptedContent,
        signature,
        publicKey,
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
 * Handle encrypted file upload with E2EE
 * @param {Object} socket - Socket.io socket
 * @param {Object} data - Data from client {encryptedFile, mimeType, filename, signature, publicKey}
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

        const { encryptedFile, mimeType, filename, signature, publicKey } = data;
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
        const room = await getRoomInfo(roomId);

        // Check if room allows media
        const mediaValidation = validateRoomSupportsMedia(room);
        if (!mediaValidation.valid) {
            return callback({
                success: false,
                error: mediaValidation.error
            });
        }

        // Validate encrypted file size
        const sizeValidation = validateFileSize(encryptedFile, room.contentSizeLimit);
        if (!sizeValidation.valid) {
            return callback({
                success: false,
                error: sizeValidation.error
            });
        }

        // Get user IP
        const userIP = socket.handshake.address;

        // Save encrypted file message (E2EE - server never decrypts)
        // Store encrypted content directly without decryption
        const result = await saveEncryptedFileMessage({ 
            roomId, 
            username: nickname, 
            userIP, 
            encryptedContent: encryptedFile,
            mimeType,
            filename,
            signature,
            publicKey
        });

        // Build file data for broadcasting (encrypted)
        const fileData = buildFileData(
            result.messageId,
            nickname,
            filename,
            mimeType,
            encryptedFile,
            signature,
            publicKey,
            result.timestamp
        );

        // Broadcast encrypted file to all users in room
        broadcastFile(io, roomId, fileData);

        // Audit log (server cannot read encrypted content)
        console.log(`[AUDIT] Encrypted file sent: room=${roomId}, user=${nickname}, file=${filename}, messageId=${result.messageId}, signed=${!!signature}`);

        callback({
            success: true,
            messageId: result.messageId,
            timestamp: result.timestamp
        });

    } catch (error) {
        console.error('[WS] Error sending encrypted file:', error);
        callback({
            success: false,
            error: error.message
        });
    }
}