import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock bcrypt before importing the module under test
const mockHash = jest.fn();
const mockCompare = jest.fn();

jest.unstable_mockModule('bcrypt', () => ({
    default: {
        hash: mockHash,
        compare: mockCompare
    }
}));

const bcrypt = (await import('bcrypt')).default;
const { generateHash, compareHash } = await import('../../../src/security/bcrypter.js');

describe('Bcrypter', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('generateHash', () => {
        it('should hash data with default salt rounds (10)', async () => {
            const expectedHash = '$2b$10$hashedvalue';
            mockHash.mockResolvedValue(expectedHash);

            const result = await generateHash('mypassword');

            expect(mockHash).toHaveBeenCalledWith('mypassword', 10);
            expect(result).toBe(expectedHash);
        });

        it('should hash data with custom salt rounds', async () => {
            const expectedHash = '$2b$12$hashedvalue';
            mockHash.mockResolvedValue(expectedHash);

            const result = await generateHash('mypassword', 12);

            expect(mockHash).toHaveBeenCalledWith('mypassword', 12);
            expect(result).toBe(expectedHash);
        });

        it('should hash different values to different hashes', async () => {
            bcrypt.hash
                .mockResolvedValueOnce('$2b$10$hash1')
                .mockResolvedValueOnce('$2b$10$hash2');

            const result1 = await generateHash('password1');
            const result2 = await generateHash('password2');

            expect(result1).not.toBe(result2);
        });

        it('should handle empty string', async () => {
            const expectedHash = '$2b$10$emptyHash';
            mockHash.mockResolvedValue(expectedHash);

            const result = await generateHash('');

            expect(mockHash).toHaveBeenCalledWith('', 10);
            expect(result).toBe(expectedHash);
        });

        it('should handle numeric input as string', async () => {
            const expectedHash = '$2b$10$numericHash';
            mockHash.mockResolvedValue(expectedHash);

            const result = await generateHash('123456');

            expect(mockHash).toHaveBeenCalledWith('123456', 10);
            expect(result).toBe(expectedHash);
        });

        it('should handle errors from bcrypt', async () => {
            const error = new Error('Bcrypt error');
            mockHash.mockRejectedValue(error);

            await expect(generateHash('password')).rejects.toThrow('Bcrypt error');
        });
    });

    describe('compareHash', () => {
        it('should return true for matching password and hash', async () => {
            mockCompare.mockResolvedValue(true);

            const result = await compareHash('mypassword', '$2b$10$hashedvalue');

            expect(mockCompare).toHaveBeenCalledWith('mypassword', '$2b$10$hashedvalue');
            expect(result).toBe(true);
        });

        it('should return false for non-matching password and hash', async () => {
            mockCompare.mockResolvedValue(false);

            const result = await compareHash('wrongpassword', '$2b$10$hashedvalue');

            expect(mockCompare).toHaveBeenCalledWith('wrongpassword', '$2b$10$hashedvalue');
            expect(result).toBe(false);
        });

        it('should handle empty password', async () => {
            mockCompare.mockResolvedValue(false);

            const result = await compareHash('', '$2b$10$hashedvalue');

            expect(mockCompare).toHaveBeenCalledWith('', '$2b$10$hashedvalue');
            expect(result).toBe(false);
        });

        it('should handle numeric passwords', async () => {
            mockCompare.mockResolvedValue(true);

            const result = await compareHash('123456', '$2b$10$hashedvalue');

            expect(mockCompare).toHaveBeenCalledWith('123456', '$2b$10$hashedvalue');
            expect(result).toBe(true);
        });

        it('should handle errors from bcrypt', async () => {
            const error = new Error('Comparison error');
            mockCompare.mockRejectedValue(error);

            await expect(compareHash('password', 'hash')).rejects.toThrow('Comparison error');
        });

        it('should handle multiple sequential comparisons', async () => {
            bcrypt.compare
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(true);

            const result1 = await compareHash('correct', 'hash');
            const result2 = await compareHash('wrong', 'hash');
            const result3 = await compareHash('correct', 'hash');

            expect(result1).toBe(true);
            expect(result2).toBe(false);
            expect(result3).toBe(true);
        });
    });
});
