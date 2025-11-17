import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Create the mock function first
const mockGetLatestMessages = jest.fn();

// Mock the module before importing
jest.unstable_mockModule('../../../src/services/messageService.js', () => ({
    getLatestMessages: mockGetLatestMessages,
}));

// Now import the modules (must happen after mock setup)
const { getLatestMessagesC } = await import('../../../src/controllers/messageController.js');
const { createMockRequest, createMockResponse, createMockNext } = await import('../../helpers/mockFactories.js');

describe('Message Controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getLatestMessagesC', () => {
        it('should return messages with default pagination', async () => {
            const mockMessages = [
                { id: '1', content: 'Message 1', username: 'user1' },
                { id: '2', content: 'Message 2', username: 'user2' }
            ];
            mockGetLatestMessages.mockResolvedValue(mockMessages);

            const req = createMockRequest({
                params: { roomId: 'room-123' },
                query: {}
            });
            const res = createMockResponse();
            const next = createMockNext();

            await getLatestMessagesC(req, res, next);

            expect(mockGetLatestMessages).toHaveBeenCalledWith('room-123', {
                limit: 50,
                skip: 0
            });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                messages: mockMessages
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('should return messages with custom pagination', async () => {
            const mockMessages = [
                { id: '3', content: 'Message 3', username: 'user3' }
            ];
            mockGetLatestMessages.mockResolvedValue(mockMessages);

            const req = createMockRequest({
                params: { roomId: 'room-123' },
                query: { numberOfMessages: '10', skip: '5' }
            });
            const res = createMockResponse();
            const next = createMockNext();

            await getLatestMessagesC(req, res, next);

            expect(mockGetLatestMessages).toHaveBeenCalledWith('room-123', {
                limit: 10,
                skip: 5
            });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                messages: mockMessages
            });
        });

        it('should handle string query parameters and convert to integers', async () => {
            mockGetLatestMessages.mockResolvedValue([]);

            const req = createMockRequest({
                params: { roomId: 'room-123' },
                query: { numberOfMessages: '25', skip: '10' }
            });
            const res = createMockResponse();
            const next = createMockNext();

            await getLatestMessagesC(req, res, next);

            expect(mockGetLatestMessages).toHaveBeenCalledWith('room-123', {
                limit: 25,
                skip: 10
            });
        });

        it('should use default limit when numberOfMessages is not provided', async () => {
            mockGetLatestMessages.mockResolvedValue([]);

            const req = createMockRequest({
                params: { roomId: 'room-123' },
                query: { skip: '10' }
            });
            const res = createMockResponse();
            const next = createMockNext();

            await getLatestMessagesC(req, res, next);

            expect(mockGetLatestMessages).toHaveBeenCalledWith('room-123', {
                limit: 50,
                skip: 10
            });
        });

        it('should use default skip when not provided', async () => {
            mockGetLatestMessages.mockResolvedValue([]);

            const req = createMockRequest({
                params: { roomId: 'room-123' },
                query: { numberOfMessages: '20' }
            });
            const res = createMockResponse();
            const next = createMockNext();

            await getLatestMessagesC(req, res, next);

            expect(mockGetLatestMessages).toHaveBeenCalledWith('room-123', {
                limit: 20,
                skip: 0
            });
        });

        it('should return empty array when no messages found', async () => {
            mockGetLatestMessages.mockResolvedValue([]);

            const req = createMockRequest({
                params: { roomId: 'room-123' },
                query: {}
            });
            const res = createMockResponse();
            const next = createMockNext();

            await getLatestMessagesC(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                messages: []
            });
        });

        it('should call next with error when service throws error', async () => {
            const error = new Error('Service error');
            mockGetLatestMessages.mockRejectedValue(error);

            const req = createMockRequest({
                params: { roomId: 'room-123' },
                query: {}
            });
            const res = createMockResponse();
            const next = createMockNext();

            await getLatestMessagesC(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
            expect(res.status).not.toHaveBeenCalled();
            expect(res.json).not.toHaveBeenCalled();
        });

        it('should handle NaN query parameters', async () => {
            mockGetLatestMessages.mockResolvedValue([]);

            const req = createMockRequest({
                params: { roomId: 'room-123' },
                query: { numberOfMessages: 'invalid', skip: 'also-invalid' }
            });
            const res = createMockResponse();
            const next = createMockNext();

            await getLatestMessagesC(req, res, next);

            expect(mockGetLatestMessages).toHaveBeenCalledWith('room-123', {
                limit: 50,
                skip: 0
            });
        });

        it('should extract roomId from params correctly', async () => {
            mockGetLatestMessages.mockResolvedValue([]);

            const req = createMockRequest({
                params: { roomId: 'specific-room-id-456' },
                query: {}
            });
            const res = createMockResponse();
            const next = createMockNext();

            await getLatestMessagesC(req, res, next);

            expect(mockGetLatestMessages).toHaveBeenCalledWith('specific-room-id-456', expect.any(Object));
        });
    });
});
