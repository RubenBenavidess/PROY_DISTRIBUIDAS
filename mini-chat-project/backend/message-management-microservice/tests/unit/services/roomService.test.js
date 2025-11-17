import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Create mock functions first
let mockRoom = jest.fn();
const mockRoomFindOne = jest.fn();
const mockRoomFind = jest.fn();
const mockRoomDeleteOne = jest.fn();
const mockRoomFindOneAndDelete = jest.fn();
mockRoom.findOne = mockRoomFindOne;
mockRoom.find = mockRoomFind;
mockRoom.deleteOne = mockRoomDeleteOne;
mockRoom.findOneAndDelete = mockRoomFindOneAndDelete;

const mockGenerateHash = jest.fn();
const mockCompareHash = jest.fn();

const userNicknames = new Map();

// Mock the modules before importing
jest.unstable_mockModule('../../../src/models/Room.js', () => ({
    default: mockRoom
}));
jest.unstable_mockModule('../../../src/security/bcrypter.js', () => ({
    generateHash: mockGenerateHash,
    compareHash: mockCompareHash,
}));
jest.unstable_mockModule('../../../src/websocket/socketHandler.js', () => ({
    userNicknames: userNicknames
}));

// Now import the modules (must happen after mock setup)
const {
    createRoom,
    joinRoom,
    leaveRoom,
    getRoomInfo,
    getAllRooms,
    deleteRoom,
    getRoomParticipantCount,
    isNicknameInUse,
    getRoomParticipants
} = await import('../../../src/services/roomService.js');

describe('Room Service', () => {
    let consoleLogSpy;

    beforeEach(() => {
        jest.clearAllMocks();
        userNicknames.clear();
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        // Reset mock functions
        mockRoom.findOne = mockRoomFindOne;
        mockRoom.find = mockRoomFind;
        mockRoom.deleteOne = mockRoomDeleteOne;
        mockRoom.findOneAndDelete = mockRoomFindOneAndDelete;
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
    });

    describe('createRoom', () => {
        it('should create a room successfully', async () => {
            const mockRoomInstance = {
                roomId: expect.any(String),
                pin: 'hashedPin123',
                type: 'text',
                sizeLimit: 30,
                title: 'Test Room',
                contentSizeLimit: 5,
                createdAt: new Date(),
                save: jest.fn().mockResolvedValue(true)
            };

            mockGenerateHash.mockResolvedValue('hashedPin123');
            mockRoom.mockImplementation(() => mockRoomInstance);

            const result = await createRoom({
                title: 'Test Room',
                type: 'text',
                sizeLimit: 30,
                contentSizeLimit: 5,
                adminId: 'admin-123'
            });

            expect(mockGenerateHash).toHaveBeenCalled();
            expect(mockRoomInstance.save).toHaveBeenCalled();
            expect(result).toMatchObject({
                success: true,
                type: 'text',
                sizeLimit: 30,
                title: 'Test Room',
                contentSizeLimit: 5
            });
            expect(result.roomId).toBeDefined();
            expect(result.pin).toBeDefined();
        });

        it('should use default values for optional fields', async () => {
            const mockRoomInstance = {
                save: jest.fn().mockResolvedValue(true),
                createdAt: new Date()
            };

            mockGenerateHash.mockResolvedValue('hashed');
            mockRoom.mockImplementation(() => mockRoomInstance);

            const result = await createRoom({
                title: 'Room',
                type: 'text',
                adminId: 'admin'
            });

            expect(result.sizeLimit).toBeDefined();
        });

        it('should log audit trail', async () => {
            const mockRoomInstance = {
                save: jest.fn().mockResolvedValue(true),
                createdAt: new Date()
            };

            mockGenerateHash.mockResolvedValue('hashed');
            mockRoom.mockImplementation(() => mockRoomInstance);

            await createRoom({
                title: 'Test',
                type: 'text',
                adminId: 'admin-123'
            });

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('[AUDIT] Room created:')
            );
        });
    });

    describe('joinRoom', () => {
        it('should join room successfully with valid credentials', async () => {
            const mockRoom = {
                roomId: 'room-123',
                type: 'text',
                sizeLimit: 30,
                contentSizeLimit: 5,
                comparePin: jest.fn().mockResolvedValue(true),
                canAddMore: jest.fn().mockReturnValue(true)
            };

            mockRoomFindOne.mockResolvedValue(mockRoom);

            const result = await joinRoom(
                { roomId: 'room-123', pin: '123456' },
                { nickname: 'user1', sessionId: 'session-123' }
            );

            expect(mockRoomFindOne).toHaveBeenCalledWith({ roomId: 'room-123' });
            expect(mockRoom.comparePin).toHaveBeenCalledWith('123456');
            expect(result).toEqual({
                success: true,
                roomId: 'room-123',
                roomType: 'text',
                sizeLimit: 30,
                contentSizeLimit: 5,
                currentParticipants: 1
            });
        });

        it('should throw error when room not found', async () => {
            mockRoomFindOne.mockResolvedValue(null);

            await expect(joinRoom(
                { roomId: 'nonexistent', pin: '123456' },
                { nickname: 'user', sessionId: 'session' }
            )).rejects.toThrow('Room not found');
        });

        it('should throw error with invalid PIN', async () => {
            const mockRoom = {
                comparePin: jest.fn().mockResolvedValue(false)
            };

            mockRoomFindOne.mockResolvedValue(mockRoom);

            await expect(joinRoom(
                { roomId: 'room-123', pin: 'wrong' },
                { nickname: 'user', sessionId: 'session' }
            )).rejects.toThrow('Invalid PIN');
        });

        it('should throw error when room is full', async () => {
            const mockRoom = {
                comparePin: jest.fn().mockResolvedValue(true),
                canAddMore: jest.fn().mockReturnValue(false)
            };

            mockRoomFindOne.mockResolvedValue(mockRoom);

            await expect(joinRoom(
                { roomId: 'room-123', pin: '123456' },
                { nickname: 'user', sessionId: 'session' }
            )).rejects.toThrow('Room is full');
        });

        it('should throw error when nickname is already in use', async () => {
            const mockRoom = {
                comparePin: jest.fn().mockResolvedValue(true),
                canAddMore: jest.fn().mockReturnValue(true)
            };

            mockRoomFindOne.mockResolvedValue(mockRoom);
            
            // Simulate existing user with same nickname
            userNicknames.set('socket-1', { 
                roomId: 'room-123', 
                nickname: 'existinguser', 
                sessionId: 'old-session' 
            });

            await expect(joinRoom(
                { roomId: 'room-123', pin: '123456' },
                { nickname: 'existinguser', sessionId: 'new-session' }
            )).rejects.toThrow('Nickname already in use in this room');
        });

        it('should log audit trail on successful join', async () => {
            const mockRoom = {
                type: 'text',
                sizeLimit: 30,
                contentSizeLimit: 5,
                comparePin: jest.fn().mockResolvedValue(true),
                canAddMore: jest.fn().mockReturnValue(true)
            };

            mockRoomFindOne.mockResolvedValue(mockRoom);

            await joinRoom(
                { roomId: 'room-123', pin: '123456' },
                { nickname: 'user1', sessionId: 'session-123' }
            );

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('[AUDIT] User joined room:')
            );
        });
    });

    describe('leaveRoom', () => {
        it('should leave room successfully', async () => {
            userNicknames.set('socket-1', { 
                roomId: 'room-123', 
                nickname: 'user1', 
                sessionId: 'session-1' 
            });

            const result = await leaveRoom('room-123', 'session-1', 'user1');

            expect(result).toEqual({
                success: true,
                remainingParticipants: 1 // Still 1 because leaveRoom doesn't remove from map (handler does)
            });
        });

        it('should log audit trail', async () => {
            await leaveRoom('room-123', 'session-1', 'user1');

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('[AUDIT] User left room:')
            );
        });

        it('should return correct remaining participant count', async () => {
            userNicknames.set('socket-1', { roomId: 'room-123', nickname: 'user1', sessionId: 's1' });
            userNicknames.set('socket-2', { roomId: 'room-123', nickname: 'user2', sessionId: 's2' });

            const result = await leaveRoom('room-123', 's1', 'user1');

            expect(result.remainingParticipants).toBe(2); // Still 2 because we don't remove from map here
        });
    });

    describe('getRoomInfo', () => {
        it('should return room info successfully', async () => {
            const mockRoom = {
                roomId: 'room-123',
                title: 'Test Room',
                type: 'text',
                sizeLimit: 30,
                contentSizeLimit: 5,
                createdAt: new Date()
            };

            mockRoomFindOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockRoom)
            });

            const result = await getRoomInfo('room-123');

            expect(result).toMatchObject({
                roomId: 'room-123',
                title: 'Test Room',
                type: 'text',
                sizeLimit: 30,
                contentSizeLimit: 5,
                currentParticipants: 0
            });
        });

        it('should throw error when room not found', async () => {
            mockRoomFindOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue(null)
            });

            await expect(getRoomInfo('nonexistent')).rejects.toThrow('Room not found');
        });

        it('should include current participant count', async () => {
            const mockRoom = {
                roomId: 'room-123',
                title: 'Test',
                type: 'text',
                sizeLimit: 30,
                contentSizeLimit: 5,
                createdAt: new Date()
            };

            mockRoomFindOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockRoom)
            });

            userNicknames.set('s1', { roomId: 'room-123', nickname: 'u1', sessionId: 'ss1' });
            userNicknames.set('s2', { roomId: 'room-123', nickname: 'u2', sessionId: 'ss2' });

            const result = await getRoomInfo('room-123');

            expect(result.currentParticipants).toBe(2);
        });
    });

    describe('getAllRooms', () => {
        it('should return all rooms with participant counts', async () => {
            const mockRooms = [
                { roomId: 'room-1', title: 'Room 1', type: 'text', sizeLimit: 30, contentSizeLimit: 5, createdAt: new Date() },
                { roomId: 'room-2', title: 'Room 2', type: 'text/media', sizeLimit: 20, contentSizeLimit: 10, createdAt: new Date() }
            ];

            mockRoomFind.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockRooms)
            });

            userNicknames.set('s1', { roomId: 'room-1', nickname: 'u1', sessionId: 'ss1' });

            const result = await getAllRooms();

            expect(result).toHaveLength(2);
            expect(result[0].currentParticipants).toBe(1);
            expect(result[1].currentParticipants).toBe(0);
        });

        it('should return empty array when no rooms exist', async () => {
            mockRoomFind.mockReturnValue({
                lean: jest.fn().mockResolvedValue([])
            });

            const result = await getAllRooms();

            expect(result).toEqual([]);
        });
    });

    describe('deleteRoom', () => {
        it('should delete room successfully', async () => {
            const mockRoom = { roomId: 'room-123', title: 'Test Room' };

            mockRoomFindOneAndDelete.mockResolvedValue(mockRoom);

            const result = await deleteRoom('room-123');

            expect(mockRoomFindOneAndDelete).toHaveBeenCalledWith({ roomId: 'room-123' });
            expect(result).toEqual({
                success: true,
                message: 'Room deleted successfully'
            });
        });

        it('should throw error when room not found', async () => {
            mockRoomFindOneAndDelete.mockResolvedValue(null);

            await expect(deleteRoom('nonexistent')).rejects.toThrow('Room not found');
        });

        it('should log audit trail', async () => {
            const mockRoom = { roomId: 'room-123' };
            mockRoomFindOneAndDelete.mockResolvedValue(mockRoom);

            await deleteRoom('room-123');

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('[AUDIT] Room deleted:')
            );
        });
    });

    describe('getRoomParticipantCount', () => {
        it('should return correct participant count for room', () => {
            userNicknames.set('s1', { roomId: 'room-123', nickname: 'u1', sessionId: 'ss1' });
            userNicknames.set('s2', { roomId: 'room-123', nickname: 'u2', sessionId: 'ss2' });
            userNicknames.set('s3', { roomId: 'room-456', nickname: 'u3', sessionId: 'ss3' });

            const count = getRoomParticipantCount('room-123');

            expect(count).toBe(2);
        });

        it('should return 0 for empty room', () => {
            const count = getRoomParticipantCount('empty-room');

            expect(count).toBe(0);
        });
    });

    describe('isNicknameInUse', () => {
        it('should return true when nickname is in use in room', () => {
            userNicknames.set('s1', { roomId: 'room-123', nickname: 'taken', sessionId: 'ss1' });

            const result = isNicknameInUse('taken', 'room-123');

            expect(result).toBe(true);
        });

        it('should return false when nickname is not in use', () => {
            userNicknames.set('s1', { roomId: 'room-123', nickname: 'user1', sessionId: 'ss1' });

            const result = isNicknameInUse('available', 'room-123');

            expect(result).toBe(false);
        });

        it('should return false for same nickname in different room', () => {
            userNicknames.set('s1', { roomId: 'room-123', nickname: 'user1', sessionId: 'ss1' });

            const result = isNicknameInUse('user1', 'room-456');

            expect(result).toBe(false);
        });
    });

    describe('getRoomParticipants', () => {
        it('should return all participants in a room', async () => {
            userNicknames.set('s1', { roomId: 'room-123', nickname: 'user1', sessionId: 'ss1' });
            userNicknames.set('s2', { roomId: 'room-123', nickname: 'user2', sessionId: 'ss2' });
            userNicknames.set('s3', { roomId: 'room-456', nickname: 'user3', sessionId: 'ss3' });

            const participants = await getRoomParticipants('room-123');

            expect(participants).toHaveLength(2);
            expect(participants).toContainEqual({
                socketId: 's1',
                nickname: 'user1',
                sessionId: 'ss1'
            });
            expect(participants).toContainEqual({
                socketId: 's2',
                nickname: 'user2',
                sessionId: 'ss2'
            });
        });

        it('should return empty array for room with no participants', async () => {
            const participants = await getRoomParticipants('empty-room');

            expect(participants).toEqual([]);
        });
    });
});
