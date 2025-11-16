import Room from '../models/Room.js';
import encryptionService from './encryptionService.js';

class RoomService {
    constructor() {
        this.activeSessions = new Map(); // roomId -> Set of session IDs
    }

    /**
     * Create a new room
     */
    async createRoom(roomData) {
        try {
            const { title, type, sizeLimit = 30, contentSizeLimit = 10, adminId } = roomData;

            // Generate unique room ID
            const roomId = encryptionService.generateRoomId();

            // Generate random PIN (4-6 digits)
            const pin = Math.floor(1000 + Math.random() * 9000).toString();

            // Hash PIN before storing
            const { hash: hashedPin, salt } = encryptionService.hashPin(pin);

            // Create room
            const room = new Room({
                roomId,
                pin: `${hashedPin}:${salt}`, // Store hash:salt
                type,
                sizeLimit,
                title,
                contentSizeLimit
            });

            await room.save();

            // Log for audit trail
            console.log(`[AUDIT] Room created: ${roomId} by admin: ${adminId || 'unknown'} at ${new Date().toISOString()}`);

            return {
                success: true,
                roomId,
                pin,
                type,
                sizeLimit,
                title,
                contentSizeLimit,
                createdAt: room.createdAt
            };
        } catch (error) {
            console.error('Error creating room:', error);
            throw error;
        }
    }

    /**
     * Verify room PIN and join
     */
    async joinRoom(roomId, pin, nickname, sessionId) {
        try {
            const room = await Room.findOne({ roomId });

            if (!room) {
                throw new Error('Room not found');
            }

            // Verify PIN
            const [hashedPin, salt] = room.pin.split(':');
            const isValidPin = encryptionService.verifyPin(pin, hashedPin, salt);

            if (!isValidPin) {
                throw new Error('Invalid PIN');
            }

            // Check room capacity
            const currentParticipants = this.getRoomParticipantCount(roomId);
            if (!room.compareLimit(currentParticipants)) {
                throw new Error('Room is full');
            }

            // Check nickname uniqueness in room
            if (this.isNicknameInUse(roomId, nickname)) {
                throw new Error('Nickname already in use in this room');
            }

            // Add session to room
            if (!this.activeSessions.has(roomId)) {
                this.activeSessions.set(roomId, new Set());
            }
            this.activeSessions.get(roomId).add(sessionId);

            // Log for audit
            console.log(`[AUDIT] User joined room: ${roomId}, nickname: ${nickname}, session: ${sessionId} at ${new Date().toISOString()}`);

            return {
                success: true,
                roomId,
                roomType: room.type,
                sizeLimit: room.sizeLimit,
                contentSizeLimit: room.contentSizeLimit,
                currentParticipants: currentParticipants + 1
            };
        } catch (error) {
            console.error('Error joining room:', error);
            throw error;
        }
    }

    /**
     * Leave room
     */
    async leaveRoom(roomId, sessionId, nickname) {
        try {
            if (this.activeSessions.has(roomId)) {
                this.activeSessions.get(roomId).delete(sessionId);

                // Clean up empty room sessions
                if (this.activeSessions.get(roomId).size === 0) {
                    this.activeSessions.delete(roomId);
                }
            }

            // Log for audit
            console.log(`[AUDIT] User left room: ${roomId}, nickname: ${nickname}, session: ${sessionId} at ${new Date().toISOString()}`);

            return {
                success: true,
                remainingParticipants: this.getRoomParticipantCount(roomId)
            };
        } catch (error) {
            console.error('Error leaving room:', error);
            throw error;
        }
    }

    /**
     * Get room info
     */
    async getRoomInfo(roomId) {
        try {
            const room = await Room.findOne({ roomId }).lean();

            if (!room) {
                throw new Error('Room not found');
            }

            return {
                roomId: room.roomId,
                type: room.type,
                sizeLimit: room.sizeLimit,
                contentSizeLimit: room.contentSizeLimit,
                currentParticipants: this.getRoomParticipantCount(roomId),
                createdAt: room.createdAt
            };
        } catch (error) {
            console.error('Error getting room info:', error);
            throw error;
        }
    }

    /**
     * Get all rooms (admin only)
     */
    async getAllRooms() {
        try {
            const rooms = await Room.find().lean();

            return rooms.map(room => ({
                roomId: room.roomId,
                type: room.type,
                sizeLimit: room.sizeLimit,
                currentParticipants: this.getRoomParticipantCount(room.roomId),
                createdAt: room.createdAt
            }));
        } catch (error) {
            console.error('Error getting rooms:', error);
            throw error;
        }
    }

    /**
     * Delete room (admin only)
     */
    async deleteRoom(roomId) {
        try {
            const room = await Room.findOneAndDelete({ roomId });

            if (!room) {
                throw new Error('Room not found');
            }

            // Clear active sessions
            this.activeSessions.delete(roomId);

            // Log for audit
            console.log(`[AUDIT] Room deleted: ${roomId} at ${new Date().toISOString()}`);

            return {
                success: true,
                message: 'Room deleted successfully'
            };
        } catch (error) {
            console.error('Error deleting room:', error);
            throw error;
        }
    }

    /**
     * Helper: Get room participant count
     */
    getRoomParticipantCount(roomId) {
        return this.activeSessions.has(roomId) 
            ? this.activeSessions.get(roomId).size 
            : 0;
    }

    /**
     * Helper: Check if nickname is in use
     */
    isNicknameInUse(roomId, nickname) {
        // This would need to be implemented with socket.io
        // For now, return false
        return false;
    }

    /**
     * Get participants in room
     */
    getRoomParticipants(roomId) {
        if (!this.activeSessions.has(roomId)) {
            return [];
        }

        return Array.from(this.activeSessions.get(roomId));
    }
}

export default new RoomService();
