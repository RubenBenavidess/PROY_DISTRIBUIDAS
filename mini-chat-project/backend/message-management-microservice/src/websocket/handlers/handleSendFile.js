import roomService from '../../services/roomService.js';
import messageService from '../../services/messageService.js';
import encryptionService from '../../services/encryptionService.js';
import { userNicknames } from '../socketHandler.js';

/**
 * Handle file upload
 */
export async function handleSendFile(socket, data, callback, io) {
    try {
        const userInfo = userNicknames.get(socket.id);

        if (!userInfo) {
            return callback({
                success: false,
                error: 'Not in a room'
            });
        }

        const { fileBuffer, mimeType, filename } = data;
        const { roomId, nickname } = userInfo;

        // Get room info
        const room = await roomService.getRoomInfo(roomId);

        // Check if room allows media
        if (room.type !== 'text/media') {
            return callback({
                success: false,
                error: 'Room does not support file uploads'
            });
        }

        // Validate file size
        if (fileBuffer.length > room.contentSizeLimit * 1024 * 1024) {
            return callback({
                success: false,
                error: `File too large. Maximum size is ${room.contentSizeLimit}MB`
            });
        }

        const userIP = socket.handshake.address;

        // Process file (delegates to file-verification-microservice)
        const result = await messageService.processFileUpload(
            Buffer.from(fileBuffer),
            mimeType,
            filename,
            roomId,
            nickname,
            userIP
        );

        // Broadcast file to room
        const fileData = {
            username: nickname,
            hashedUsername: encryptionService.hashUsername(nickname, roomId),
            contentType: messageService.getContentTypeFromMime(mimeType),
            filename: filename,
            hash: result.hash,
            signature: result.signature,
            size: result.size,
            verified: result.verified,
            timestamp: result.timestamp
        };

        io.to(roomId).emit('new-file', fileData);

        // Log for audit
        console.log(`[AUDIT] File sent: room=${roomId}, user=${nickname}, hash=${result.hash}`);

        callback({
            success: true,
            hash: result.hash,
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