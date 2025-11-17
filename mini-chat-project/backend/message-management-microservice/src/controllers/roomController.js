import { 
    createRoom as createRoomService, 
    getRoomInfo as getRoomInfoService, 
    getAllRooms as getAllRoomsService, 
    deleteRoom as deleteRoomService, 
    getRoomParticipants as getRoomParticipantsService 
} from "../services/roomService.js";

export async function createRoom(req, res, next) {
    try {
        const { title, type, sizeLimit, contentSizeLimit } = req.body;
        // Get admin ID from authenticated user
        const adminId = req.user?.id || 'system';

        const result = await createRoomService({
            title,
            type,
            sizeLimit,
            contentSizeLimit,
            adminId
        });

        res.status(201).json(result);
    } catch (e) {
        next(e);
    }
}

export async function getRoomInfo(req, res, next) {
    try {
        const { roomId } = req.params;
        const roomInfo = await getRoomInfoService(roomId);
        res.status(200).json({
            success: true,
            room: roomInfo
        });
    } catch (error) {
        next(error);
    }
}

export async function getAllRooms(req, res, next) {
    try {
        const rooms = await getAllRoomsService();
        res.status(200).json({
            success: true,
            rooms
        });
    } catch (error) {
        next(error);
    }
}

export async function deleteRoom(req, res, next) {
    try {
        const { roomId } = req.params;
        const result = await deleteRoomService(roomId);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

export async function getRoomParticipants(req, res, next) {
    try {
        const { roomId } = req.params;
        const participants = await getRoomParticipantsService(roomId);
        res.status(200).json({
            success: true,
            count: participants.length,
            participants
        });
    } catch (error) {
        next(error);
    }
}