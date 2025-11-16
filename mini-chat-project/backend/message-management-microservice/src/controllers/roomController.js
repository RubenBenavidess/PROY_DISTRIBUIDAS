import roomService from '../services/roomService.js';

class RoomController {
    /**
     * Create a new room (admin only)
     */
    async createRoom(req, res, next) {
        try {
            const { title, type, sizeLimit, contentSizeLimit } = req.body;
            // Get admin ID from authenticated user
            const adminId = req.user?.id || 'system';

            const result = await roomService.createRoom({
                title,
                type,
                sizeLimit,
                contentSizeLimit,
                adminId
            });

            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get all rooms (admin only)
     */
    async getAllRooms(req, res, next) {
        try {
            const rooms = await roomService.getAllRooms();
            res.status(200).json({
                success: true,
                rooms
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get room info
     */
    async getRoomInfo(req, res, next) {
        try {
            const { roomId } = req.params;
            const roomInfo = await roomService.getRoomInfo(roomId);
            res.status(200).json({
                success: true,
                room: roomInfo
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete a room (admin only)
     */
    async deleteRoom(req, res, next) {
        try {
            const { roomId } = req.params;
            const result = await roomService.deleteRoom(roomId);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get room participants
     */
    async getRoomParticipants(req, res, next) {
        try {
            const { roomId } = req.params;
            const participants = roomService.getRoomParticipants(roomId);
            res.status(200).json({
                success: true,
                count: participants.length,
                participants
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new RoomController();
