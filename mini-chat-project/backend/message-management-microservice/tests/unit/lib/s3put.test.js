import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Create mock functions
const mockS3Send = jest.fn();
class PutObjectCommand {
    constructor(input) {
        this.input = input;
    }
}
const mockCreateReadStream = jest.fn();

// Mock AWS SDK
jest.unstable_mockModule('@aws-sdk/client-s3', () => ({
    S3Client: class {
        send = mockS3Send;
    },
    PutObjectCommand: PutObjectCommand
}));

// Mock fs
jest.unstable_mockModule('fs', () => ({
    default: {
        createReadStream: mockCreateReadStream
    }
}));

// Import after mocking
const { putFromFile, putFromBuffer } = await import('../../../src/lib/s3put.js');

describe('S3 Put Operations', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockS3Send.mockResolvedValue({});
    });

    describe('putFromFile', () => {
        it('should upload file from local path to S3', async () => {
            const mockFileStream = { pipe: jest.fn() };
            mockCreateReadStream.mockReturnValue(mockFileStream);

            await putFromFile('/local/path/file.txt', 's3/key/file.txt');

            expect(mockCreateReadStream).toHaveBeenCalledWith('/local/path/file.txt');
            expect(mockS3Send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
        });

        it('should use correct S3 key', async () => {
            const mockFileStream = {};
            mockCreateReadStream.mockReturnValue(mockFileStream);

            await putFromFile('/local/file.pdf', 'documents/report.pdf');

            const callArg = mockS3Send.mock.calls[0][0];
            expect(callArg.input.Key).toBe('documents/report.pdf');
        });

        it('should set content type to application/octet-stream', async () => {
            const mockFileStream = {};
            mockCreateReadStream.mockReturnValue(mockFileStream);

            await putFromFile('/local/file', 'key');

            const callArg = mockS3Send.mock.calls[0][0];
            expect(callArg.input.ContentType).toBe('application/octet-stream');
        });

        it('should handle upload errors', async () => {
            const mockFileStream = {};
            mockCreateReadStream.mockReturnValue(mockFileStream);
            const error = new Error('S3 upload failed');
            mockS3Send.mockRejectedValue(error);

            await expect(putFromFile('/local/file', 'key')).rejects.toThrow('S3 upload failed');
        });
    });

    describe('putFromBuffer', () => {
        it('should upload buffer to S3', async () => {
            const buffer = Buffer.from('test content');

            await putFromBuffer(buffer, 's3/key/file.txt');

            expect(mockS3Send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
        });

        it('should use provided S3 key', async () => {
            const buffer = Buffer.from('data');

            await putFromBuffer(buffer, 'images/photo.png');

            const callArg = mockS3Send.mock.calls[0][0];
            expect(callArg.input.Key).toBe('images/photo.png');
        });

        it('should upload buffer as body', async () => {
            const buffer = Buffer.from('test data');

            await putFromBuffer(buffer, 'key');

            const callArg = mockS3Send.mock.calls[0][0];
            expect(callArg.input.Body).toBe(buffer);
        });

        it('should set content type to application/octet-stream', async () => {
            const buffer = Buffer.from('data');

            await putFromBuffer(buffer, 'key');

            const callArg = mockS3Send.mock.calls[0][0];
            expect(callArg.input.ContentType).toBe('application/octet-stream');
        });

        it('should handle empty buffer', async () => {
            const buffer = Buffer.from('');

            await putFromBuffer(buffer, 'empty-file');

            expect(mockS3Send).toHaveBeenCalled();
        });

        it('should handle large buffer', async () => {
            const buffer = Buffer.alloc(1024 * 1024 * 5, 'x'); // 5MB

            await putFromBuffer(buffer, 'large-file');

            expect(mockS3Send).toHaveBeenCalled();
        });

        it('should handle upload errors', async () => {
            const buffer = Buffer.from('data');
            const error = new Error('Network error');
            mockS3Send.mockRejectedValue(error);

            await expect(putFromBuffer(buffer, 'key')).rejects.toThrow('Network error');
        });
    });

    describe('S3Client Configuration', () => {
        it('should use correct bucket from environment', async () => {
            process.env.MINIO_BUCKET = 'test-bucket';
            const buffer = Buffer.from('data');

            // Re-import to pick up env var
            jest.resetModules();
            const { putFromBuffer: putFromBufferReloaded } = await import('../../../src/lib/s3put.js');
            
            await putFromBufferReloaded(buffer, 'key');

            const callArg = mockS3Send.mock.calls[0][0];
            expect(callArg.input.Bucket).toBeDefined();
        });
    });
});
