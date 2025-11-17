import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Create mock functions first
const mockSaveMessage = jest.fn();
const userNicknames = new Map();

// Mock the modules before importing
jest.unstable_mockModule('../../../../src/services/messageService.js', () => ({
    saveMessage: mockSaveMessage,
}));
jest.unstable_mockModule('../../../../src/websocket/socketHandler.js', () => ({
    userNicknames: userNicknames
}));

// Now import the modules (must happen after mock setup)
const { handleSendMessage } = await import('../../../../src/websocket/handlers/handleSendMessage.js');
const { createMockSocket, createMockIO } = await import('../../../helpers/mockFactories.js');

describe('handleSendMessage', () => {
    let mockSocket;
    let mockIO;
    let mockCallback;
    let consoleLogSpy;

    beforeEach(() => {
        jest.clearAllMocks();
        userNicknames.clear();
        mockSocket = createMockSocket();
        mockIO = createMockIO();
        mockCallback = jest.fn();
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
    });

    describe('Validation', () => {
        it('should reject when user not in a room', async () => {
            const data = { content: 'Hello world' };

            await handleSendMessage(mockSocket, data, mockCallback, mockIO);

            expect(mockCallback).toHaveBeenCalledWith({
                success: false,
                error: 'Not in a room'
            });
        });

        it('should reject when content is missing', async () => {
            userNicknames.set(mockSocket.id, { 
                roomId: 'room-123', 
                nickname: 'user1' 
            });

            const data = {};

            await handleSendMessage(mockSocket, data, mockCallback, mockIO);

            expect(mockCallback).toHaveBeenCalledWith({
                success: false,
                error: 'Message content is required'
            });
        });

        it('should reject when content is not a string', async () => {
            userNicknames.set(mockSocket.id, { 
                roomId: 'room-123', 
                nickname: 'user1' 
            });

            const data = { content: 123 };

            await handleSendMessage(mockSocket, data, mockCallback, mockIO);

            expect(mockCallback).toHaveBeenCalledWith({
                success: false,
                error: 'Message content is required'
            });
        });

        it('should reject when content is empty string', async () => {
            userNicknames.set(mockSocket.id, { 
                roomId: 'room-123', 
                nickname: 'user1' 
            });

            const data = { content: '   ' };

            await handleSendMessage(mockSocket, data, mockCallback, mockIO);

            expect(mockCallback).toHaveBeenCalledWith({
                success: false,
                error: 'Message cannot be empty'
            });
        });
    });

    describe('Successful Message Send', () => {
        it('should send message successfully', async () => {
            userNicknames.set(mockSocket.id, { 
                roomId: 'room-123', 
                nickname: 'hasheduser', 
                sessionId: 'session-1' 
            });

            const mockResult = {
                messageId: 'msg-id-123',
                timestamp: new Date()
            };
            mockSaveMessage.mockResolvedValue(mockResult);

            const data = { content: 'Hello, world!' };

            await handleSendMessage(mockSocket, data, mockCallback, mockIO);

            expect(mockSaveMessage).toHaveBeenCalledWith({
                roomId: 'room-123',
                username: 'hasheduser',
                userIP: mockSocket.handshake.address,
                content: 'Hello, world!'
            });

            expect(mockCallback).toHaveBeenCalledWith({
                success: true,
                messageId: 'msg-id-123',
                timestamp: mockResult.timestamp
            });
        });

        it('should broadcast message to all users in room', async () => {
            userNicknames.set(mockSocket.id, { 
                roomId: 'room-123', 
                nickname: 'user1' 
            });

            const mockResult = {
                messageId: 'msg-123',
                timestamp: new Date()
            };
            mockSaveMessage.mockResolvedValue(mockResult);

            const data = { content: 'Test message' };

            await handleSendMessage(mockSocket, data, mockCallback, mockIO);

            expect(mockIO.to).toHaveBeenCalledWith('room-123');
            expect(mockIO.emit).toHaveBeenCalledWith('new-message', expect.objectContaining({
                id: 'msg-123',
                username: 'user1',
                content: 'Test message',
                contentType: 'text',
                timestamp: mockResult.timestamp
            }));
        });

        it('should extract user IP from socket handshake', async () => {
            const customSocket = createMockSocket({
                handshake: { address: '192.168.1.100' }
            });
            userNicknames.set(customSocket.id, { 
                roomId: 'room-123', 
                nickname: 'user1' 
            });

            mockSaveMessage.mockResolvedValue({
                messageId: 'msg-id',
                timestamp: new Date()
            });

            const data = { content: 'Test' };

            await handleSendMessage(customSocket, data, mockCallback, mockIO);

            expect(mockSaveMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    userIP: '192.168.1.100'
                })
            );
        });

        it('should log audit trail', async () => {
            userNicknames.set(mockSocket.id, { 
                roomId: 'room-123', 
                nickname: 'testuser' 
            });

            mockSaveMessage.mockResolvedValue({
                messageId: 'msg-123',
                timestamp: new Date()
            });

            const data = { content: 'Message' };

            await handleSendMessage(mockSocket, data, mockCallback, mockIO);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('[AUDIT] Message sent:')
            );
        });

        it('should include encrypted content from client', async () => {
            userNicknames.set(mockSocket.id, { 
                roomId: 'room-123', 
                nickname: 'user1' 
            });

            mockSaveMessage.mockResolvedValue({
                messageId: 'msg-id',
                timestamp: new Date()
            });

            const encryptedContent = 'encrypted-message-data';
            const data = { content: encryptedContent };

            await handleSendMessage(mockSocket, data, mockCallback, mockIO);

            expect(mockSaveMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: encryptedContent
                })
            );
        });
    });

    describe('Error Handling', () => {
        it('should handle save message errors', async () => {
            userNicknames.set(mockSocket.id, { 
                roomId: 'room-123', 
                nickname: 'user1' 
            });

            mockSaveMessage.mockRejectedValue(new Error('Database error'));

            const data = { content: 'Test' };

            await handleSendMessage(mockSocket, data, mockCallback, mockIO);

            expect(mockCallback).toHaveBeenCalledWith({
                success: false,
                error: 'Database error'
            });
        });

        it('should log errors to console', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            userNicknames.set(mockSocket.id, { 
                roomId: 'room-123', 
                nickname: 'user1' 
            });

            mockSaveMessage.mockRejectedValue(new Error('Test error'));

            const data = { content: 'Message' };

            await handleSendMessage(mockSocket, data, mockCallback, mockIO);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                '[WS] Error sending message:',
                expect.any(Error)
            );

            consoleErrorSpy.mockRestore();
        });

        it('should not broadcast on error', async () => {
            userNicknames.set(mockSocket.id, { 
                roomId: 'room-123', 
                nickname: 'user1' 
            });

            mockSaveMessage.mockRejectedValue(new Error('Save failed'));

            const data = { content: 'Test' };

            await handleSendMessage(mockSocket, data, mockCallback, mockIO);

            expect(mockIO.to).not.toHaveBeenCalled();
            expect(mockIO.emit).not.toHaveBeenCalled();
        });
    });
});
