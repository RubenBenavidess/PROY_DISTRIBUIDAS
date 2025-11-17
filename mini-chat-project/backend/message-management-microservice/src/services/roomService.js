import Room from '../models/Room.js';
import { v4 as uuidv4 } from "uuid";
import { generateHash } from "../security/bcrypter.js"
import { userNicknames as activeSessions } from "../websocket/socketHandler.js";

/**
 * ------ LOGIC FUNCTIONS ------
 */

// Random Data Generation

const generateRoomId = () => {
    return uuidv4();
};

const generatePIN = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Participant Logic

const getRoomParticipantCount = (roomId) => {
    return activeSessions.has(roomId) 
        ? activeSessions.get(roomId).size 
        : 0;
};

export function isNicknameInUse(){ // JOAN
    return true;
}


/**
 * ------ MAIN FUNCTIONS ------
 */

/**
 * @param {Object} roomData - Room data {title, type, sizeLimit, contentSizeLimit, adminId} 
 * @returns {Object} - Saved room info
 */
export async function createRoom(roomData){

    const { title, type, sizeLimit = 30, contentSizeLimit = 10, adminId } = roomData;

    // Generate unique room ID
    const roomId = generateRoomId();

    // Generate random PIN (4-6 digits)
    const pin = generatePIN();

    // Hash PIN before storing
    const hashedPin = generateHash(pin);

    // Create room
    const room = new Room({
        roomId,
        hashedPin,
        type,
        sizeLimit,
        title,
        contentSizeLimit
    });

    await room.save();

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

}

/**
 * 
 * @param {Object} user -  roomId, pin, nickname, sessionId
 * @returns {Object}
 */
export async function joinRoom(roomData, userData){
    
    const { roomId, pin } = roomData;
    const { nickname, sessionId } = userData;
    
    const room = await Room.findOne({ roomId });

    if (!room) throw new Error('Room not found');

    // Verify PIN
    const isValidPin = await room.comparePin(pin);

    if (!isValidPin) throw new Error('Invalid PIN');

    // Check room capacity
    const currentParticipants = getRoomParticipantCount(roomId);

    if (!room.compareLimit(currentParticipants)) throw new Error('Room is full');

    // Check nickname uniqueness in room
    if (isNicknameInUse()) throw new Error('Nickname already in use in this room');
    
    // Add session to room
    if (!activeSessions.has(roomId)) activeSessions.set(roomId, new Set());
    activeSessions.get(roomId).add(sessionId);

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
}

/**
 * 
 * @param {String} roomId 
 * @param {String} sessionId 
 * @param {String} nickname 
 * @returns remainingParticipants info
 */
export async function leaveRoom(roomId, sessionId, nickname) {
    if (activeSessions.has(roomId)) {
        activeSessions.get(roomId).delete(sessionId);

        // Clean up empty room sessions
        if (activeSessions.get(roomId).size === 0) {
            activeSessions.delete(roomId);
        }
    }

    // Log for audit
    console.log(`[AUDIT] User left room: ${roomId}, nickname: ${nickname}, session: ${sessionId} at ${new Date().toISOString()}`);

    const remainingParticipants = getRoomParticipantCount(roomId);

    return {
        success: true,
        remainingParticipants
    };
}

/**
 * 
 * @param {String} roomId 
 * @returns 
 */
export async function getRoomInfo(roomId) {
    const room = await Room.findOne({ roomId }).lean();

    if (!room) throw new Error('Room not found');
    
    return {
        roomId: room.roomId,
        type: room.type,
        sizeLimit: room.sizeLimit,
        contentSizeLimit: room.contentSizeLimit,
        currentParticipants: getRoomParticipantCount(roomId),
        createdAt: room.createdAt
    };
}

/**
 * @returns rooms info
 */
export async function getAllRooms() {
    const rooms = await Room.find().lean();

    return rooms.map(room => ({
        roomId: room.roomId,
        type: room.type,
        sizeLimit: room.sizeLimit,
        currentParticipants: getRoomParticipantCount(room.roomId),
        createdAt: room.createdAt
    }));
}

/**
 * @param {String} roomId 
 * @returns 
 */
export async function deleteRoom(roomId) {
    const room = await Room.findOneAndDelete({ roomId });

    if (!room) throw new Error('Room not found');

    // Clear active sessions
    activeSessions.delete(roomId);

    // Log for audit
    console.log(`[AUDIT] Room deleted: ${roomId} at ${new Date().toISOString()}`);

    return {
        success: true,
        message: 'Room deleted successfully'
    };
}

/**
 * 
 * @param {String} roomId 
 * @returns roomParticipants info
 */
export async function getRoomParticipants(roomId) {
    if (activeSessions.has(roomId)) return [];
    return Array.from(activeSessions.get(roomId));
}
