import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Create mock functions first
const mockLeaveRoom = jest.fn();
const mockGetRoomParticipantCount = jest.fn();
const userNicknames = new Map();
const sessionCache = {
    del: jest.fn()
};
const roomSockets = new Map();

// Mock the modules before importing
jest.unstable_mockModule('../../../../src/services/roomService.js', () => ({
    leaveRoom: mockLeaveRoom,
    getRoomParticipantCount: mockGetRoomParticipantCount,
}));
jest.unstable_mockModule('../../../../src/websocket/socketHandler.js', () => ({
    userNicknames: userNicknames,
    sessionCache: sessionCache,
    roomSockets: roomSockets
}));

// Now import the modules (must happen after mock setup)
const { handleLeaveRoom } = await import('../../../../src/websocket/handlers/handleLeaveRoom.js');
const { handleDisconnect } = await import('../../../../src/websocket/handlers/handleDisconnect.js');
const { createMockSocket } = await import('../../../helpers/mockFactories.js');

describe('handleLeaveRoom and handleDisconnect', () => {
    let consoleLogSpy;

    beforeEach(() => {
        jest.clearAllMocks();
        userNicknames.clear();
        roomSockets.clear();
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
    });

    describe('handleLeaveRoom', () => {
        it('should leave room successfully', async () => {
            const mockSocket = createMockSocket({ id: 'socket-1' });
            const mockCallback = jest.fn();

            userNicknames.set('socket-1', {
                roomId: 'room-123',
                nickname: 'user1',
                sessionId: 'session-1'
            });
            roomSockets.set('room-123', new Set(['socket-1']));

            mockLeaveRoom.mockResolvedValue({ success: true, remainingParticipants: 0 });

            await handleLeaveRoom(mockSocket, mockCallback);

            expect(mockLeaveRoom).toHaveBeenCalledWith('room-123', 'session-1', 'user1');
            expect(mockSocket.leave).toHaveBeenCalledWith('room-123');
            expect(mockCallback).toHaveBeenCalledWith({ success: true });
        });

        it('should return error when user not in a room', async () => {
            const mockSocket = createMockSocket();
            const mockCallback = jest.fn();

            await handleLeaveRoom(mockSocket, mockCallback);

            expect(mockCallback).toHaveBeenCalledWith({
                success: false,
                error: 'Not in a room'
            });
            expect(mockLeaveRoom).not.toHaveBeenCalled();
        });

        it('should clear session data', async () => {
            const mockSocket = createMockSocket({ id: 'socket-1' });
            const mockCallback = jest.fn();

            userNicknames.set('socket-1', {
                roomId: 'room-123',
                nickname: 'user1',
                sessionId: 'session-1'
            });
            roomSockets.set('room-123', new Set(['socket-1']));

            mockLeaveRoom.mockResolvedValue({ success: true });

            await handleLeaveRoom(mockSocket, mockCallback);

            expect(userNicknames.has('socket-1')).toBe(false);
            expect(sessionCache.del).toHaveBeenCalledWith('session-1');
        });

        it('should remove socket from room tracking', async () => {
            const mockSocket = createMockSocket({ id: 'socket-1' });
            const mockCallback = jest.fn();

            userNicknames.set('socket-1', {
                roomId: 'room-123',
                nickname: 'user1',
                sessionId: 'session-1'
            });
            roomSockets.set('room-123', new Set(['socket-1', 'socket-2']));

            mockLeaveRoom.mockResolvedValue({ success: true });

            await handleLeaveRoom(mockSocket, mockCallback);

            expect(roomSockets.get('room-123').has('socket-1')).toBe(false);
            expect(roomSockets.has('room-123')).toBe(true); // Room still exists
        });

        it('should delete empty room from tracking', async () => {
            const mockSocket = createMockSocket({ id: 'socket-1' });
            const mockCallback = jest.fn();

            userNicknames.set('socket-1', {
                roomId: 'room-123',
                nickname: 'user1',
                sessionId: 'session-1'
            });
            roomSockets.set('room-123', new Set(['socket-1']));

            mockLeaveRoom.mockResolvedValue({ success: true });

            await handleLeaveRoom(mockSocket, mockCallback);

            expect(roomSockets.has('room-123')).toBe(false);
        });

        it('should notify other users', async () => {
            const mockSocket = createMockSocket({ id: 'socket-1' });
            const mockCallback = jest.fn();

            userNicknames.set('socket-1', {
                roomId: 'room-123',
                nickname: 'user1',
                sessionId: 'session-1'
            });
            roomSockets.set('room-123', new Set(['socket-1']));

            mockLeaveRoom.mockResolvedValue({ success: true });
            mockGetRoomParticipantCount.mockReturnValue(1);

            await handleLeaveRoom(mockSocket, mockCallback);

            expect(mockSocket.to).toHaveBeenCalledWith('room-123');
            expect(mockSocket.emit).toHaveBeenCalledWith('user-left', {
                username: 'user1',
                timestamp: expect.any(Number),
                participants: expect.any(Number)
            });
        });

        it('should log audit trail', async () => {
            const mockSocket = createMockSocket({ id: 'socket-1' });
            const mockCallback = jest.fn();

            userNicknames.set('socket-1', {
                roomId: 'room-123',
                nickname: 'user1',
                sessionId: 'session-1'
            });
            roomSockets.set('room-123', new Set(['socket-1']));

            mockLeaveRoom.mockResolvedValue({ success: true });

            await handleLeaveRoom(mockSocket, mockCallback);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('[AUDIT] User left room:')
            );
        });

        it('should handle service errors', async () => {
            const mockSocket = createMockSocket({ id: 'socket-1' });
            const mockCallback = jest.fn();
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            userNicknames.set('socket-1', {
                roomId: 'room-123',
                nickname: 'user1',
                sessionId: 'session-1'
            });

            mockLeaveRoom.mockRejectedValue(new Error('Service error'));

            await handleLeaveRoom(mockSocket, mockCallback);

            expect(mockCallback).toHaveBeenCalledWith({
                success: false,
                error: 'Service error'
            });
            expect(consoleErrorSpy).toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });
    });

    describe('handleDisconnect', () => {
        it('should handle disconnect when user is in a room', async () => {
            const mockSocket = createMockSocket({ id: 'socket-1' });

            userNicknames.set('socket-1', {
                roomId: 'room-123',
                nickname: 'user1',
                sessionId: 'session-1'
            });
            roomSockets.set('room-123', new Set(['socket-1']));

            mockLeaveRoom.mockResolvedValue({ success: true });
            mockGetRoomParticipantCount.mockReturnValue(0);

            await handleDisconnect(mockSocket);

            expect(mockLeaveRoom).toHaveBeenCalledWith('room-123', 'session-1', 'user1');
            expect(userNicknames.has('socket-1')).toBe(false);
            expect(sessionCache.del).toHaveBeenCalledWith('session-1');
        });

        it('should handle disconnect when user not in a room', async () => {
            const mockSocket = createMockSocket({ id: 'socket-1' });

            await handleDisconnect(mockSocket);

            expect(mockLeaveRoom).not.toHaveBeenCalled();
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('[WS] Client disconnected: socket-1')
            );
        });

        it('should clean up room tracking', async () => {
            const mockSocket = createMockSocket({ id: 'socket-1' });

            userNicknames.set('socket-1', {
                roomId: 'room-123',
                nickname: 'user1',
                sessionId: 'session-1'
            });
            roomSockets.set('room-123', new Set(['socket-1', 'socket-2']));

            mockLeaveRoom.mockResolvedValue({ success: true });

            await handleDisconnect(mockSocket);

            expect(roomSockets.get('room-123').has('socket-1')).toBe(false);
        });

        it('should delete empty rooms', async () => {
            const mockSocket = createMockSocket({ id: 'socket-1' });

            userNicknames.set('socket-1', {
                roomId: 'room-123',
                nickname: 'user1',
                sessionId: 'session-1'
            });
            roomSockets.set('room-123', new Set(['socket-1']));

            mockLeaveRoom.mockResolvedValue({ success: true });

            await handleDisconnect(mockSocket);

            expect(roomSockets.has('room-123')).toBe(false);
        });

        it('should notify remaining participants', async () => {
            const mockSocket = createMockSocket({ id: 'socket-1' });

            userNicknames.set('socket-1', {
                roomId: 'room-123',
                nickname: 'user1',
                sessionId: 'session-1'
            });

            mockLeaveRoom.mockResolvedValue({ success: true });
            mockGetRoomParticipantCount.mockReturnValue(1);

            await handleDisconnect(mockSocket);

            expect(mockSocket.to).toHaveBeenCalledWith('room-123');
            expect(mockSocket.emit).toHaveBeenCalledWith('user-left', {
                username: 'user1',
                timestamp: expect.any(Number),
                participants: 1
            });
        });

        it('should log disconnect with room info', async () => {
            const mockSocket = createMockSocket({ id: 'socket-1' });

            userNicknames.set('socket-1', {
                roomId: 'room-123',
                nickname: 'user1',
                sessionId: 'session-1'
            });

            mockLeaveRoom.mockResolvedValue({ success: true });

            await handleDisconnect(mockSocket);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('[WS] Client disconnected: socket-1, room: room-123')
            );
        });

        it('should handle multiple disconnects gracefully', async () => {
            const socket1 = createMockSocket({ id: 'socket-1' });
            const socket2 = createMockSocket({ id: 'socket-2' });

            userNicknames.set('socket-1', { roomId: 'room-123', nickname: 'user1', sessionId: 's1' });
            userNicknames.set('socket-2', { roomId: 'room-123', nickname: 'user2', sessionId: 's2' });
            roomSockets.set('room-123', new Set(['socket-1', 'socket-2']));

            mockLeaveRoom.mockResolvedValue({ success: true });

            await handleDisconnect(socket1);
            await handleDisconnect(socket2);

            expect(userNicknames.size).toBe(0);
            expect(roomSockets.has('room-123')).toBe(false);
        });
    });
});
