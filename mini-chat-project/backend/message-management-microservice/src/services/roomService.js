import Room from '../models/Room.js';
import { v4 as uuidv4 } from "uuid";
import { generateHash } from "../security/bcrypter.js"
import { userNicknames as activeSessions } from "../websocket/socketHandler.js";
import { sendLogToMicroservice } from './logsClient.js';

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
export function getRoomParticipantCount(roomId) {
    // activeSessions is a Map: socketId -> { roomId, nickname, sessionId }
    // We need to count how many sessions belong to this roomId
    let count = 0;
    for (const [socketId, sessionData] of activeSessions.entries()) {
        if (sessionData.roomId === roomId) {
            count++;
        }
    }
    return count;
};

export function isNicknameInUse(nickname, roomId) {    
    // Iterate through all active sessions to check if nickname is already in use in the specified room
    for (const [socketId, sessionData] of activeSessions.entries()) {
        if (sessionData.roomId === roomId && sessionData.nickname === nickname) {
            return true;
        }
    }
    return false;
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

    // Generate random PIN (6 digits)
    const pin = generatePIN();

    // Hash PIN before storing
    const hashedPin = await generateHash(pin);

    // Create room
    const room = new Room({
        roomId,
        pin: hashedPin,
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

    if (!room.canAddMore(currentParticipants)) throw new Error('Room is full');

    // Check nickname uniqueness in room
    if (isNicknameInUse(nickname, roomId)) throw new Error('Nickname already in use in this room');
    
    // Note: Session is added to activeSessions (userNicknames) in handleJoinRoom via storeUserSession
    // activeSessions structure: socketId -> { roomId, nickname, sessionId }
    // We don't add it here because we don't have the socketId at this layer

    // Log for audit
    console.log(`[AUDIT] User joined room: ${roomId}, nickname: ${nickname}, session: ${sessionId} at ${new Date().toISOString()}`);

    // Log the room join event non-blocking
    try {
        await sendLogToMicroservice({
            actorId: nickname,
            eventType: 'ROOM_JOIN',
            details: { roomId, sessionId }
        });
    } catch (err) {
        console.error('Failed to log room join event:', err.message);
    }

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
    // activeSessions is a Map: socketId -> { roomId, nickname, sessionId }
    // We need to find and remove the entry with matching sessionId
    // Note: This is typically called from handleLeaveRoom which already manages activeSessions
    // So this function doesn't need to modify activeSessions directly
    
    // Log for audit
    console.log(`[AUDIT] User left room: ${roomId}, nickname: ${nickname}, session: ${sessionId} at ${new Date().toISOString()}`);

    // Log the room leave event non-blocking
    try {
        await sendLogToMicroservice({
            actorId: nickname,
            eventType: 'ROOM_LEAVE',
            details: { roomId, sessionId }
        });
    } catch (err) {
        console.error('Failed to log room leave event:', err.message);
    }

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
        title: room.title,
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
        title: room.title,
        type: room.type,
        sizeLimit: room.sizeLimit,
        contentSizeLimit: room.contentSizeLimit,
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

    // Note: activeSessions cleanup is handled by the websocket layer
    // when users are disconnected or the room is closed

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
    // activeSessions is a Map: socketId -> { roomId, nickname, sessionId }
    // We need to find all participants in this room
    const participants = [];
    
    for (const [socketId, sessionData] of activeSessions.entries()) {
        if (sessionData.roomId === roomId) {
            participants.push({
                socketId,
                nickname: sessionData.nickname,
                sessionId: sessionData.sessionId
            });
        }
    }
    
    return participants;
}
