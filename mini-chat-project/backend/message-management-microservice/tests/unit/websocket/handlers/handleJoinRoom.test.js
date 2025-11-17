import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Create mock functions first
const mockJoinRoom = jest.fn();
const mockGetLatestMessages = jest.fn();
const sessionCache = {
    set: jest.fn()
};
const userNicknames = new Map();
const roomSockets = new Map();

// Mock the modules before importing
jest.unstable_mockModule('../../../../src/services/roomService.js', () => ({
    joinRoom: mockJoinRoom,
}));
jest.unstable_mockModule('../../../../src/services/messageService.js', () => ({
    getLatestMessages: mockGetLatestMessages,
}));
jest.unstable_mockModule('../../../../src/websocket/socketHandler.js', () => ({
    sessionCache: sessionCache,
    userNicknames: userNicknames,
    roomSockets: roomSockets
}));

// Now import the modules (must happen after mock setup)
const { handleJoinRoom } = await import('../../../../src/websocket/handlers/handleJoinRoom.js');
const { createMockSocket } = await import('../../../helpers/mockFactories.js');

describe('handleJoinRoom', () => {
    let mockSocket;
    let mockCallback;
    let consoleLogSpy;

    beforeEach(() => {
        jest.clearAllMocks();
        userNicknames.clear();
        roomSockets.clear();
        mockSocket = createMockSocket();
        mockCallback = jest.fn();
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
    });

    describe('Validation', () => {
        it('should reject request when roomId is missing', async () => {
            const data = { pin: '123456', nickname: 'user1' };

            await handleJoinRoom(mockSocket, data, mockCallback);

            expect(mockCallback).toHaveBeenCalledWith({
                success: false,
                error: 'Missing required fields'
            });
        });

        it('should reject request when pin is missing', async () => {
            const data = { roomId: 'room-123', nickname: 'user1' };

            await handleJoinRoom(mockSocket, data, mockCallback);

            expect(mockCallback).toHaveBeenCalledWith({
                success: false,
                error: 'Missing required fields'
            });
        });

        it('should reject request when nickname is missing', async () => {
            const data = { roomId: 'room-123', pin: '123456' };

            await handleJoinRoom(mockSocket, data, mockCallback);

            expect(mockCallback).toHaveBeenCalledWith({
                success: false,
                error: 'Missing required fields'
            });
        });

        it('should reject nickname shorter than 3 characters', async () => {
            const data = { roomId: 'room-123', pin: '123456', nickname: 'ab' };

            await handleJoinRoom(mockSocket, data, mockCallback);

            expect(mockCallback).toHaveBeenCalledWith({
                success: false,
                error: 'Nickname must be between 3 and 20 characters'
            });
        });

        it('should reject nickname longer than 20 characters', async () => {
            const data = { 
                roomId: 'room-123', 
                pin: '123456', 
                nickname: 'a'.repeat(21) 
            };

            await handleJoinRoom(mockSocket, data, mockCallback);

            expect(mockCallback).toHaveBeenCalledWith({
                success: false,
                error: 'Nickname must be between 3 and 20 characters'
            });
        });

        it('should reject when user already in a room', async () => {
            userNicknames.set(mockSocket.id, { 
                roomId: 'other-room', 
                nickname: 'user1', 
                sessionId: 'session-1' 
            });

            const data = { roomId: 'room-123', pin: '123456', nickname: 'user2' };

            await handleJoinRoom(mockSocket, data, mockCallback);

            expect(mockCallback).toHaveBeenCalledWith({
                success: false,
                error: 'Already in a room. Leave current room first.'
            });
        });
    });

    describe('Successful Join', () => {
        it('should join room successfully with valid data', async () => {
            const mockMessages = [
                { id: '1', content: 'Message 1' },
                { id: '2', content: 'Message 2' }
            ];

            mockJoinRoom.mockResolvedValue({
                success: true,
                roomId: 'room-123',
                roomType: 'text',
                sizeLimit: 30,
                contentSizeLimit: 5,
                currentParticipants: 1
            });
            mockGetLatestMessages.mockResolvedValue(mockMessages);

            const data = { roomId: 'room-123', pin: '123456', nickname: 'testuser' };

            await handleJoinRoom(mockSocket, data, mockCallback);

            expect(mockJoinRoom).toHaveBeenCalled();
            expect(mockGetLatestMessages).toHaveBeenCalledWith('room-123', { limit: 50 });
            expect(mockSocket.join).toHaveBeenCalledWith('room-123');
            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    sessionId: expect.any(String),
                    roomInfo: expect.any(Object),
                    messages: mockMessages
                })
            );
        });

        it('should store session in cache', async () => {
            mockJoinRoom.mockResolvedValue({
                success: true,
                roomId: 'room-123',
                roomType: 'text',
                sizeLimit: 30,
                contentSizeLimit: 5,
                currentParticipants: 1
            });
            mockGetLatestMessages.mockResolvedValue([]);

            const data = { roomId: 'room-123', pin: '123456', nickname: 'user1' };

            await handleJoinRoom(mockSocket, data, mockCallback);

            expect(sessionCache.set).toHaveBeenCalled();
        });

        it('should add user to userNicknames map', async () => {
            mockJoinRoom.mockResolvedValue({
                success: true,
                roomId: 'room-123',
                roomType: 'text',
                sizeLimit: 30,
                contentSizeLimit: 5,
                currentParticipants: 1
            });
            mockGetLatestMessages.mockResolvedValue([]);

            const data = { roomId: 'room-123', pin: '123456', nickname: 'user1' };

            await handleJoinRoom(mockSocket, data, mockCallback);

            expect(userNicknames.has(mockSocket.id)).toBe(true);
            const userInfo = userNicknames.get(mockSocket.id);
            expect(userInfo.roomId).toBe('room-123');
            expect(userInfo.nickname).toBeDefined();
            expect(userInfo.sessionId).toBeDefined();
        });

        it('should add socket to room tracking', async () => {
            mockJoinRoom.mockResolvedValue({
                success: true,
                roomId: 'room-123',
                roomType: 'text',
                sizeLimit: 30,
                contentSizeLimit: 5,
                currentParticipants: 1
            });
            mockGetLatestMessages.mockResolvedValue([]);

            const data = { roomId: 'room-123', pin: '123456', nickname: 'user1' };

            await handleJoinRoom(mockSocket, data, mockCallback);

            expect(roomSockets.has('room-123')).toBe(true);
            expect(roomSockets.get('room-123').has(mockSocket.id)).toBe(true);
        });

        it('should notify other users in room', async () => {
            mockJoinRoom.mockResolvedValue({
                success: true,
                roomId: 'room-123',
                roomType: 'text',
                sizeLimit: 30,
                contentSizeLimit: 5,
                currentParticipants: 2
            });
            mockGetLatestMessages.mockResolvedValue([]);

            const data = { roomId: 'room-123', pin: '123456', nickname: 'newuser' };

            await handleJoinRoom(mockSocket, data, mockCallback);

            expect(mockSocket.to).toHaveBeenCalledWith('room-123');
            expect(mockSocket.emit).toHaveBeenCalledWith('user-joined', expect.objectContaining({
                username: expect.any(String),
                timestamp: expect.any(Number),
                participants: 2
            }));
        });

        it('should hash nickname deterministically', async () => {
            mockJoinRoom.mockResolvedValue({
                success: true,
                roomId: 'room-123',
                roomType: 'text',
                sizeLimit: 30,
                contentSizeLimit: 5,
                currentParticipants: 1
            });
            mockGetLatestMessages.mockResolvedValue([]);

            const data = { roomId: 'room-123', pin: '123456', nickname: 'testuser' };

            await handleJoinRoom(mockSocket, data, mockCallback);

            // Verify that joinRoom was called with a hashed nickname
            const callArgs = mockJoinRoom.mock.calls[0];
            expect(callArgs[1].nickname).not.toBe('testuser');
            expect(callArgs[1].nickname).toHaveLength(16);
        });

        it('should log audit trail', async () => {
            mockJoinRoom.mockResolvedValue({
                success: true,
                roomId: 'room-123',
                roomType: 'text',
                sizeLimit: 30,
                contentSizeLimit: 5,
                currentParticipants: 1
            });
            mockGetLatestMessages.mockResolvedValue([]);

            const data = { roomId: 'room-123', pin: '123456', nickname: 'user1' };

            await handleJoinRoom(mockSocket, data, mockCallback);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('[AUDIT] User joined via WebSocket:')
            );
        });
    });

    describe('Error Handling', () => {
        it('should handle room service errors', async () => {
            mockJoinRoom.mockRejectedValue(new Error('Room not found'));

            const data = { roomId: 'nonexistent', pin: '123456', nickname: 'user1' };

            await handleJoinRoom(mockSocket, data, mockCallback);

            expect(mockCallback).toHaveBeenCalledWith({
                success: false,
                error: 'Room not found'
            });
        });

        it('should handle message retrieval errors', async () => {
            mockJoinRoom.mockResolvedValue({
                success: true,
                roomId: 'room-123',
                roomType: 'text',
                sizeLimit: 30,
                contentSizeLimit: 5,
                currentParticipants: 1
            });
            mockGetLatestMessages.mockRejectedValue(new Error('Database error'));

            const data = { roomId: 'room-123', pin: '123456', nickname: 'user1' };

            await handleJoinRoom(mockSocket, data, mockCallback);

            expect(mockCallback).toHaveBeenCalledWith({
                success: false,
                error: 'Database error'
            });
        });

        it('should log errors to console', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            mockJoinRoom.mockRejectedValue(new Error('Test error'));

            const data = { roomId: 'room-123', pin: '123456', nickname: 'user1' };

            await handleJoinRoom(mockSocket, data, mockCallback);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                '[WS] Error joining room:',
                expect.any(Error)
            );

            consoleErrorSpy.mockRestore();
        });
    });
});
