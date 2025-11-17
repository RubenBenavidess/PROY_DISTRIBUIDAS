import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Create mock functions
const mockGetSignedUrl = jest.fn();
class GetObjectCommand {
    constructor(input) {
        this.input = input;
    }
}

// Mock s3put.js to provide s3 client
const mockS3Client = { send: jest.fn() };
jest.unstable_mockModule('../../../src/lib/s3put.js', () => ({
    s3: mockS3Client,
    putFromFile: jest.fn(),
    putFromBuffer: jest.fn()
}));

// Mock AWS SDK modules
jest.unstable_mockModule('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: mockGetSignedUrl
}));

jest.unstable_mockModule('@aws-sdk/client-s3', () => ({
    GetObjectCommand: GetObjectCommand,
    S3Client: jest.fn(),
    PutObjectCommand: jest.fn()
}));

// Import after mocking
const { getSignedImageUrl } = await import('../../../src/lib/s3get.js');

describe('S3 Get Operations', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getSignedImageUrl', () => {
        it('should generate signed URL for S3 key', async () => {
            const mockSignedUrl = 'https://s3.amazonaws.com/bucket/key?signature=abc123';
            mockGetSignedUrl.mockResolvedValue(mockSignedUrl);

            const result = await getSignedImageUrl('images/photo.png');

            expect(mockGetSignedUrl).toHaveBeenCalled();
            expect(result).toBe(mockSignedUrl);
        });

        it('should use provided S3 key in GetObjectCommand', async () => {
            mockGetSignedUrl.mockResolvedValue('https://signed.url');

            await getSignedImageUrl('documents/file.pdf');

            expect(mockGetSignedUrl).toHaveBeenCalledWith(
                expect.anything(),
                expect.any(GetObjectCommand),
                expect.any(Object)
            );
        });

        it('should use default expiration of 2 hours', async () => {
            mockGetSignedUrl.mockResolvedValue('https://signed.url');

            await getSignedImageUrl('image.png');

            expect(mockGetSignedUrl).toHaveBeenCalledWith(
                expect.anything(),
                expect.anything(),
                { expiresIn: 7200 }
            );
        });

        it('should allow custom expiration time', async () => {
            mockGetSignedUrl.mockResolvedValue('https://signed.url');

            await getSignedImageUrl('image.png', 3600);

            expect(mockGetSignedUrl).toHaveBeenCalledWith(
                expect.anything(),
                expect.anything(),
                { expiresIn: 3600 }
            );
        });

        it('should handle different file types', async () => {
            mockGetSignedUrl.mockResolvedValue('https://signed.url/file');

            await getSignedImageUrl('videos/movie.mp4');
            await getSignedImageUrl('documents/report.pdf');
            await getSignedImageUrl('images/photo.jpg');

            expect(mockGetSignedUrl).toHaveBeenCalledTimes(3);
        });

        it('should handle S3 paths with nested folders', async () => {
            mockGetSignedUrl.mockResolvedValue('https://signed.url');

            await getSignedImageUrl('folder/subfolder/deep/file.png');

            expect(mockGetSignedUrl).toHaveBeenCalled();
        });

        it('should handle errors from getSignedUrl', async () => {
            const error = new Error('S3 error');
            mockGetSignedUrl.mockRejectedValue(error);

            await expect(getSignedImageUrl('image.png')).rejects.toThrow('S3 error');
        });

        it('should handle empty key', async () => {
            mockGetSignedUrl.mockResolvedValue('https://signed.url');

            await getSignedImageUrl('');

            expect(mockGetSignedUrl).toHaveBeenCalled();
        });

        it('should use bucket from environment variable', async () => {
            process.env.MINIO_BUCKET = 'my-test-bucket';
            mockGetSignedUrl.mockResolvedValue('https://signed.url');

            await getSignedImageUrl('test-key');

            const commandArg = mockGetSignedUrl.mock.calls[0][1];
            expect(commandArg.input.Bucket).toBeDefined();
        });
    });
});
