import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Create mock objects first
const userNicknames = new Map();
const sessionCache = {
    ttl: jest.fn()
};
const roomSockets = new Map();

// Mock the modules before importing
jest.unstable_mockModule('../../../../src/websocket/socketHandler.js', () => ({
    userNicknames: userNicknames,
    sessionCache: sessionCache,
    roomSockets: roomSockets
}));

// Now import the modules (must happen after mock setup)
const { handleTyping } = await import('../../../../src/websocket/handlers/handleTyping.js');
const { handleHeartbeat } = await import('../../../../src/websocket/handlers/handleHeartbeat.js');
const { handleGetParticipants } = await import('../../../../src/websocket/handlers/handleGetParticipants.js');
const { createMockSocket } = await import('../../../helpers/mockFactories.js');

describe('WebSocket Utility Handlers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        userNicknames.clear();
        roomSockets.clear();
    });

    describe('handleTyping', () => {
        it('should broadcast typing status to other users in room', () => {
            const mockSocket = createMockSocket();
            userNicknames.set(mockSocket.id, {
                roomId: 'room-123',
                nickname: 'user1',
                sessionId: 'session-1'
            });

            const data = { isTyping: true };

            handleTyping(mockSocket, data);

            expect(mockSocket.to).toHaveBeenCalledWith('room-123');
            expect(mockSocket.emit).toHaveBeenCalledWith('user-typing', {
                username: 'user1',
                isTyping: true
            });
        });

        it('should handle typing stop event', () => {
            const mockSocket = createMockSocket();
            userNicknames.set(mockSocket.id, {
                roomId: 'room-123',
                nickname: 'user1',
                sessionId: 'session-1'
            });

            const data = { isTyping: false };

            handleTyping(mockSocket, data);

            expect(mockSocket.emit).toHaveBeenCalledWith('user-typing', {
                username: 'user1',
                isTyping: false
            });
        });

        it('should do nothing when user not in a room', () => {
            const mockSocket = createMockSocket();
            const data = { isTyping: true };

            handleTyping(mockSocket, data);

            expect(mockSocket.to).not.toHaveBeenCalled();
            expect(mockSocket.emit).not.toHaveBeenCalled();
        });

        it('should work for different users', () => {
            const socket1 = createMockSocket({ id: 'socket-1' });
            const socket2 = createMockSocket({ id: 'socket-2' });

            userNicknames.set('socket-1', { roomId: 'room-123', nickname: 'alice', sessionId: 's1' });
            userNicknames.set('socket-2', { roomId: 'room-123', nickname: 'bob', sessionId: 's2' });

            handleTyping(socket1, { isTyping: true });
            handleTyping(socket2, { isTyping: true });

            expect(socket1.emit).toHaveBeenCalledWith('user-typing', {
                username: 'alice',
                isTyping: true
            });
            expect(socket2.emit).toHaveBeenCalledWith('user-typing', {
                username: 'bob',
                isTyping: true
            });
        });
    });

    describe('handleHeartbeat', () => {
        it('should update session TTL and send acknowledgment', () => {
            const mockSocket = createMockSocket();
            userNicknames.set(mockSocket.id, {
                roomId: 'room-123',
                nickname: 'user1',
                sessionId: 'session-123'
            });

            handleHeartbeat(mockSocket);

            expect(sessionCache.ttl).toHaveBeenCalledWith('session-123');
            expect(mockSocket.emit).toHaveBeenCalledWith('heartbeat-ack', {
                timestamp: expect.any(Number)
            });
        });

        it('should do nothing when user not in a room', () => {
            const mockSocket = createMockSocket();

            handleHeartbeat(mockSocket);

            expect(sessionCache.ttl).not.toHaveBeenCalled();
            expect(mockSocket.emit).not.toHaveBeenCalled();
        });

        it('should send current timestamp in acknowledgment', () => {
            const mockSocket = createMockSocket();
            userNicknames.set(mockSocket.id, {
                roomId: 'room-123',
                nickname: 'user1',
                sessionId: 'session-1'
            });

            const beforeTime = Date.now();
            handleHeartbeat(mockSocket);
            const afterTime = Date.now();

            const callArg = mockSocket.emit.mock.calls[0][1];
            expect(callArg.timestamp).toBeGreaterThanOrEqual(beforeTime);
            expect(callArg.timestamp).toBeLessThanOrEqual(afterTime);
        });

        it('should handle multiple heartbeats', () => {
            const mockSocket = createMockSocket();
            userNicknames.set(mockSocket.id, {
                roomId: 'room-123',
                nickname: 'user1',
                sessionId: 'session-1'
            });

            handleHeartbeat(mockSocket);
            handleHeartbeat(mockSocket);
            handleHeartbeat(mockSocket);

            expect(sessionCache.ttl).toHaveBeenCalledTimes(3);
            expect(mockSocket.emit).toHaveBeenCalledTimes(3);
        });
    });

    describe('handleGetParticipants', () => {
        it('should return list of participants in room', () => {
            const mockSocket = createMockSocket({ id: 'socket-1' });
            const mockCallback = jest.fn();

            userNicknames.set('socket-1', { roomId: 'room-123', nickname: 'user1', sessionId: 's1' });
            userNicknames.set('socket-2', { roomId: 'room-123', nickname: 'user2', sessionId: 's2' });
            userNicknames.set('socket-3', { roomId: 'room-456', nickname: 'user3', sessionId: 's3' });

            roomSockets.set('room-123', new Set(['socket-1', 'socket-2']));
            roomSockets.set('room-456', new Set(['socket-3']));

            handleGetParticipants(mockSocket, mockCallback);

            expect(mockCallback).toHaveBeenCalledWith({
                success: true,
                participants: expect.arrayContaining([
                    { hashedUsername: 'user1' },
                    { hashedUsername: 'user2' }
                ]),
                count: 2
            });
        });

        it('should return empty list when no participants in room', () => {
            const mockSocket = createMockSocket({ id: 'socket-1' });
            const mockCallback = jest.fn();

            userNicknames.set('socket-1', { roomId: 'room-123', nickname: 'user1', sessionId: 's1' });
            roomSockets.set('room-123', new Set(['socket-1']));

            handleGetParticipants(mockSocket, mockCallback);

            expect(mockCallback).toHaveBeenCalledWith({
                success: true,
                participants: [{ hashedUsername: 'user1' }],
                count: 1
            });
        });

        it('should return error when user not in a room', () => {
            const mockSocket = createMockSocket();
            const mockCallback = jest.fn();

            handleGetParticipants(mockSocket, mockCallback);

            expect(mockCallback).toHaveBeenCalledWith({
                success: false,
                error: 'Not in a room'
            });
        });

        it('should handle errors gracefully', () => {
            const mockSocket = createMockSocket({ id: 'socket-1' });
            const mockCallback = jest.fn();
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            userNicknames.set('socket-1', { roomId: 'room-123', nickname: 'user1', sessionId: 's1' });
            
            // Create a room socket set that will throw error when iterated
            const badSet = {
                [Symbol.iterator]() {
                    throw new Error('Map error');
                }
            };
            roomSockets.set('room-123', badSet);

            handleGetParticipants(mockSocket, mockCallback);

            expect(consoleErrorSpy).toHaveBeenCalledWith('[WS] Error getting participants:', expect.any(Error));
            expect(mockCallback).toHaveBeenCalledWith({
                success: false,
                error: 'Map error'
            });

            consoleErrorSpy.mockRestore();
        });

        it('should only include participants from same room', () => {
            const mockSocket = createMockSocket({ id: 'socket-1' });
            const mockCallback = jest.fn();

            userNicknames.set('socket-1', { roomId: 'room-123', nickname: 'user1', sessionId: 's1' });
            userNicknames.set('socket-2', { roomId: 'room-123', nickname: 'user2', sessionId: 's2' });
            userNicknames.set('socket-3', { roomId: 'room-999', nickname: 'other', sessionId: 's3' });

            roomSockets.set('room-123', new Set(['socket-1', 'socket-2']));
            roomSockets.set('room-999', new Set(['socket-3']));

            handleGetParticipants(mockSocket, mockCallback);

            const response = mockCallback.mock.calls[0][0];
            expect(response.success).toBe(true);
            expect(response.count).toBe(2);
            expect(response.participants.length).toBe(2);
            expect(response.participants).toContainEqual({ hashedUsername: 'user1' });
            expect(response.participants).toContainEqual({ hashedUsername: 'user2' });
            expect(response.participants).not.toContainEqual({ hashedUsername: 'other' });
        });
    });
});
