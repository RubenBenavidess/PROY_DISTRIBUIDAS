import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Create mock functions first
let mockMessage = jest.fn();
let mockMessageFind = jest.fn();
mockMessage.find = mockMessageFind;

const mockRoomFindOne = jest.fn();
const mockRoom = {
    findOne: mockRoomFindOne
};

const mockHealthCheck = jest.fn();
const mockVerifyMessageIntegrity = jest.fn();
const mockVerifyFile = jest.fn();
const mockSanitizeFile = jest.fn();
const mockDetectContentType = jest.fn();

const mockPutFromBuffer = jest.fn();
const mockGetSignedImageUrl = jest.fn();

// Mock the modules before importing
jest.unstable_mockModule('../../../src/models/Message.js', () => ({
    default: mockMessage
}));
jest.unstable_mockModule('../../../src/models/Room.js', () => ({
    default: mockRoom
}));
jest.unstable_mockModule('../../../src/services/fileVerificationClient.js', () => ({
    healthCheck: mockHealthCheck,
    verifyMessageIntegrity: mockVerifyMessageIntegrity,
    verifyFile: mockVerifyFile,
    sanitizeFile: mockSanitizeFile,
    detectContentType: mockDetectContentType,
}));
jest.unstable_mockModule('../../../src/lib/s3put.js', () => ({
    putFromBuffer: mockPutFromBuffer,
}));
jest.unstable_mockModule('../../../src/lib/s3get.js', () => ({
    getSignedImageUrl: mockGetSignedImageUrl,
}));

// Now import the modules (must happen after mock setup)
const { saveMessage, saveMultimediaMessage, getLatestMessages, checkFileVerificationService } = await import('../../../src/services/messageService.js');

describe('Message Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset mockMessage.find for each test
        mockMessage.find = mockMessageFind;
    });

    describe('checkFileVerificationService', () => {
        let consoleLogSpy, consoleWarnSpy;

        beforeEach(() => {
            consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
            consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        });

        afterEach(() => {
            consoleLogSpy.mockRestore();
            consoleWarnSpy.mockRestore();
        });

        it('should log success when service is available', async () => {
            mockHealthCheck.mockResolvedValue(true);

            await checkFileVerificationService();

            expect(consoleLogSpy).toHaveBeenCalledWith('File verification service is available');
        });

        it('should log warning when service is not available', async () => {
            mockHealthCheck.mockResolvedValue(false);

            await checkFileVerificationService();

            expect(consoleWarnSpy).toHaveBeenCalledWith('File verification service is not available. File uploads will be disabled.');
        });
    });

    describe('saveMessage', () => {
        it('should save a valid message successfully', async () => {
            const mockRoom = {
                roomId: 'room-123',
                type: 'text'
            };
            const mockMessageInstance = {
                _id: 'message-id-123',
                createdAt: new Date(),
                save: jest.fn().mockResolvedValue(true)
            };

            mockRoomFindOne.mockResolvedValue(mockRoom);
            mockVerifyMessageIntegrity.mockResolvedValue({ isValid: true });
            mockMessage.mockImplementation(() => mockMessageInstance);

            const result = await saveMessage({
                roomId: 'room-123',
                username: 'testuser',
                userIP: '127.0.0.1',
                content: 'Hello, world!'
            });

            expect(mockRoomFindOne).toHaveBeenCalledWith({ roomId: 'room-123' });
            expect(mockVerifyMessageIntegrity).toHaveBeenCalledWith('Hello, world!');
            expect(mockMessageInstance.save).toHaveBeenCalled();
            expect(result).toEqual({
                messageId: 'message-id-123',
                timestamp: mockMessageInstance.createdAt
            });
        });

        it('should throw error when room not found', async () => {
            mockRoomFindOne.mockResolvedValue(null);

            await expect(saveMessage({
                roomId: 'nonexistent',
                username: 'testuser',
                userIP: '127.0.0.1',
                content: 'Hello'
            })).rejects.toThrow('Room not found');

            expect(mockRoomFindOne).toHaveBeenCalledWith({ roomId: 'nonexistent' });
        });

        it('should throw error when message fails integrity verification', async () => {
            const mockRoom = { roomId: 'room-123' };
            mockRoomFindOne.mockResolvedValue(mockRoom);
            mockVerifyMessageIntegrity.mockResolvedValue({ 
                isValid: false, 
                reason: 'Contains malicious content' 
            });

            await expect(saveMessage({
                roomId: 'room-123',
                username: 'testuser',
                userIP: '127.0.0.1',
                content: '<script>alert("xss")</script>'
            })).rejects.toThrow('Message failed integrity verification');
        });

        it('should create message with correct contentType', async () => {
            const mockRoom = { roomId: 'room-123' };
            const mockMessageInstance = {
                _id: 'msg-id',
                createdAt: new Date(),
                save: jest.fn().mockResolvedValue(true)
            };

            mockRoomFindOne.mockResolvedValue(mockRoom);
            mockVerifyMessageIntegrity.mockResolvedValue({ isValid: true });
            mockMessage.mockImplementation((data) => {
                expect(data.contentType).toBe('text');
                return mockMessageInstance;
            });

            await saveMessage({
                roomId: 'room-123',
                username: 'user',
                userIP: '127.0.0.1',
                content: 'Test'
            });
        });
    });

    describe('saveMultimediaMessage', () => {
        it('should save multimedia message successfully', async () => {
            const mockRoom = {
                roomId: 'room-123',
                type: 'text/media'
            };
            const mockMessageInstance = {
                _id: 'message-id-456',
                createdAt: new Date(),
                save: jest.fn().mockResolvedValue(true)
            };
            const fileBuffer = Buffer.from('test file content');
            const sanitizedBuffer = Buffer.from('sanitized content');

            mockRoomFindOne.mockResolvedValue(mockRoom);
            mockDetectContentType.mockResolvedValue('image/png');
            mockVerifyFile.mockResolvedValue({ isSafe: true });
            mockSanitizeFile.mockResolvedValue(sanitizedBuffer);
            mockPutFromBuffer.mockResolvedValue(undefined);
            mockMessage.mockImplementation(() => mockMessageInstance);

            const result = await saveMultimediaMessage({
                roomId: 'room-123',
                username: 'testuser',
                userIP: '127.0.0.1',
                content: fileBuffer,
                filename: 'test.png'
            });

            expect(mockRoomFindOne).toHaveBeenCalledWith({ roomId: 'room-123' });
            expect(mockDetectContentType).toHaveBeenCalledWith(fileBuffer);
            expect(mockVerifyFile).toHaveBeenCalledWith(fileBuffer, 'image/png', 'test.png');
            expect(mockSanitizeFile).toHaveBeenCalledWith(fileBuffer, 'image/png', 'test.png');
            expect(mockPutFromBuffer).toHaveBeenCalled();
            expect(result).toEqual({
                messageId: 'message-id-456',
                timestamp: mockMessageInstance.createdAt
            });
        });

        it('should throw error when room not found', async () => {
            mockRoomFindOne.mockResolvedValue(null);

            await expect(saveMultimediaMessage({
                roomId: 'nonexistent',
                username: 'user',
                userIP: '127.0.0.1',
                content: Buffer.from('test'),
                filename: 'file.png'
            })).rejects.toThrow('Room not found');
        });

        it('should throw error for text-only room', async () => {
            const mockRoom = {
                roomId: 'room-123',
                type: 'text'
            };
            mockRoomFindOne.mockResolvedValue(mockRoom);

            await expect(saveMultimediaMessage({
                roomId: 'room-123',
                username: 'user',
                userIP: '127.0.0.1',
                content: Buffer.from('test'),
                filename: 'file.png'
            })).rejects.toThrow('Invalid content type for text room');
        });

        it('should throw error when file fails security verification', async () => {
            const mockRoom = {
                roomId: 'room-123',
                type: 'text/media'
            };
            mockRoomFindOne.mockResolvedValue(mockRoom);
            mockDetectContentType.mockResolvedValue('image/png');
            mockVerifyFile.mockResolvedValue({ isSafe: false });

            await expect(saveMultimediaMessage({
                roomId: 'room-123',
                username: 'user',
                userIP: '127.0.0.1',
                content: Buffer.from('malicious'),
                filename: 'malware.png'
            })).rejects.toThrow('File failed security verification');
        });

        it('should store file with timestamp in S3 URL', async () => {
            const mockRoom = { roomId: 'room-123', type: 'text/media' };
            const mockMessageInstance = {
                _id: 'msg-id',
                createdAt: new Date(),
                save: jest.fn()
            };

            mockRoomFindOne.mockResolvedValue(mockRoom);
            mockDetectContentType.mockResolvedValue('image/png');
            mockVerifyFile.mockResolvedValue({ isSafe: true });
            mockSanitizeFile.mockResolvedValue(Buffer.from('clean'));
            mockPutFromBuffer.mockResolvedValue(undefined);
            
            mockMessage.mockImplementation((data) => {
                expect(data.content).toMatch(/^messages\/room-123\/\d+_test\.png$/);
                return mockMessageInstance;
            });

            await saveMultimediaMessage({
                roomId: 'room-123',
                username: 'user',
                userIP: '127.0.0.1',
                content: Buffer.from('test'),
                filename: 'test.png'
            });
        });
    });

    describe('getLatestMessages', () => {
        it('should return messages with default pagination', async () => {
            const mockMessages = [
                { _id: '1', content: 'msg1', contentType: 'text' },
                { _id: '2', content: 'msg2', contentType: 'text' }
            ];

            const mockQuery = {
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockMessages)
            };

            mockMessageFind.mockReturnValue(mockQuery);

            const result = await getLatestMessages('room-123');

            expect(mockMessageFind).toHaveBeenCalledWith({ roomId: 'room-123' });
            expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
            expect(mockQuery.limit).toHaveBeenCalledWith(50);
            expect(mockQuery.skip).toHaveBeenCalledWith(0);
            expect(result).toEqual(mockMessages);
        });

        it('should return messages with custom pagination', async () => {
            const mockMessages = [{ _id: '1', content: 'msg', contentType: 'text' }];

            const mockQuery = {
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockMessages)
            };

            mockMessageFind.mockReturnValue(mockQuery);

            await getLatestMessages('room-123', { limit: 10, skip: 5 });

            expect(mockQuery.limit).toHaveBeenCalledWith(10);
            expect(mockQuery.skip).toHaveBeenCalledWith(5);
        });

        it('should generate signed URLs for non-text messages', async () => {
            const mockMessages = [
                { _id: '1', content: 's3://path/to/image.png', contentType: 'image/png' },
                { _id: '2', content: 'plain text', contentType: 'text' }
            ];

            const mockQuery = {
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockMessages)
            };

            mockMessageFind.mockReturnValue(mockQuery);
            mockGetSignedImageUrl.mockResolvedValue('https://signed.url/image.png');

            const result = await getLatestMessages('room-123');

            expect(mockGetSignedImageUrl).toHaveBeenCalledWith('s3://path/to/image.png');
            expect(result[0].content).toBe('https://signed.url/image.png');
            expect(result[1].content).toBe('plain text');
        });

        it('should handle errors in URL generation gracefully', async () => {
            const mockMessages = [
                { _id: '1', content: 's3://path/to/image.png', contentType: 'image/png' }
            ];

            const mockQuery = {
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockMessages)
            };

            mockMessageFind.mockReturnValue(mockQuery);
            mockGetSignedImageUrl.mockRejectedValue(new Error('S3 error'));

            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            const result = await getLatestMessages('room-123');

            expect(result[0].content).toBe('s3://path/to/image.png');
            expect(consoleErrorSpy).toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });

        it('should return empty array when no messages found', async () => {
            const mockQuery = {
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([])
            };

            mockMessageFind.mockReturnValue(mockQuery);

            const result = await getLatestMessages('room-123');

            expect(result).toEqual([]);
        });
    });
});
