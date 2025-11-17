import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import mongoose from 'mongoose';

// Mock bcrypter before importing Room
const mockGenerateHash = jest.fn();
const mockCompareHash = jest.fn();

jest.unstable_mockModule('../../../src/security/bcrypter.js', () => ({
    generateHash: mockGenerateHash,
    compareHash: mockCompareHash
}));

const { default: Room } = await import('../../../src/models/Room.js');
const { generateHash, compareHash } = await import('../../../src/security/bcrypter.js');

describe('Room Model', () => {
    describe('Schema Validation', () => {
        it('should create a valid room with all required fields', () => {
            const roomData = {
                roomId: 'room-123',
                pin: 'hashedpin123',
                type: 'text',
                sizeLimit: 30,
                contentSizeLimit: 5,
                title: 'Test Room'
            };

            const room = new Room(roomData);
            const validationError = room.validateSync();

            expect(validationError).toBeUndefined();
            expect(room.roomId).toBe(roomData.roomId);
            expect(room.pin).toBe(roomData.pin);
            expect(room.type).toBe(roomData.type);
            expect(room.sizeLimit).toBe(roomData.sizeLimit);
            expect(room.title).toBe(roomData.title);
        });

        it('should fail validation when roomId is missing', () => {
            const room = new Room({
                pin: 'hashedpin123',
                type: 'text',
                title: 'Test Room'
            });

            const validationError = room.validateSync();
            expect(validationError.errors.roomId).toBeDefined();
        });

        it('should fail validation when pin is missing', () => {
            const room = new Room({
                roomId: 'room-123',
                type: 'text',
                title: 'Test Room'
            });

            const validationError = room.validateSync();
            expect(validationError.errors.pin).toBeDefined();
        });

        it('should fail validation when type is missing', () => {
            const room = new Room({
                roomId: 'room-123',
                pin: 'hashedpin123',
                title: 'Test Room'
            });

            const validationError = room.validateSync();
            expect(validationError.errors.type).toBeDefined();
        });

        it('should fail validation with invalid type enum value', () => {
            const room = new Room({
                roomId: 'room-123',
                pin: 'hashedpin123',
                type: 'invalid-type',
                title: 'Test Room'
            });

            const validationError = room.validateSync();
            expect(validationError.errors.type).toBeDefined();
        });

        it('should accept "text" as valid type', () => {
            const room = new Room({
                roomId: 'room-123',
                pin: 'hashedpin123',
                type: 'text',
                title: 'Test Room'
            });

            const validationError = room.validateSync();
            expect(validationError).toBeUndefined();
        });

        it('should accept "text/media" as valid type', () => {
            const room = new Room({
                roomId: 'room-123',
                pin: 'hashedpin123',
                type: 'text/media',
                title: 'Test Room'
            });

            const validationError = room.validateSync();
            expect(validationError).toBeUndefined();
        });
    });

    describe('Default Values', () => {
        it('should set default sizeLimit to 30', () => {
            const room = new Room({
                roomId: 'room-123',
                pin: 'hashedpin123',
                type: 'text',
                title: 'Test Room'
            });

            expect(room.sizeLimit).toBe(30);
        });

        it('should set default contentSizeLimit to 5', () => {
            const room = new Room({
                roomId: 'room-123',
                pin: 'hashedpin123',
                type: 'text',
                title: 'Test Room'
            });

            expect(room.contentSizeLimit).toBe(5);
        });

        it('should set default title to "Untitled Room"', () => {
            const room = new Room({
                roomId: 'room-123',
                pin: 'hashedpin123',
                type: 'text'
            });

            expect(room.title).toBe('Untitled Room');
        });

        it('should allow custom sizeLimit', () => {
            const room = new Room({
                roomId: 'room-123',
                pin: 'hashedpin123',
                type: 'text',
                sizeLimit: 50,
                title: 'Test Room'
            });

            expect(room.sizeLimit).toBe(50);
        });

        it('should allow custom contentSizeLimit', () => {
            const room = new Room({
                roomId: 'room-123',
                pin: 'hashedpin123',
                type: 'text',
                contentSizeLimit: 20,
                title: 'Test Room'
            });

            expect(room.contentSizeLimit).toBe(20);
        });
    });

    describe('Instance Methods', () => {
        describe('comparePin', () => {
            it('should return true for matching PIN', async () => {
                const room = new Room({
                    roomId: 'room-123',
                    pin: 'hashedpin123',
                    type: 'text',
                    title: 'Test Room'
                });

                compareHash.mockResolvedValue(true);

                const result = await room.comparePin('123456');
                expect(result).toBe(true);
                expect(compareHash).toHaveBeenCalledWith('123456', 'hashedpin123');
            });

            it('should return false for non-matching PIN', async () => {
                const room = new Room({
                    roomId: 'room-123',
                    pin: 'hashedpin123',
                    type: 'text',
                    title: 'Test Room'
                });

                compareHash.mockResolvedValue(false);

                const result = await room.comparePin('wrong-pin');
                expect(result).toBe(false);
            });
        });

        describe('canAddMore', () => {
            it('should return true when current size is less than limit', () => {
                const room = new Room({
                    roomId: 'room-123',
                    pin: 'hashedpin123',
                    type: 'text',
                    sizeLimit: 30,
                    title: 'Test Room'
                });

                expect(room.canAddMore(20)).toBe(true);
            });

            it('should return false when current size equals limit', () => {
                const room = new Room({
                    roomId: 'room-123',
                    pin: 'hashedpin123',
                    type: 'text',
                    sizeLimit: 30,
                    title: 'Test Room'
                });

                expect(room.canAddMore(30)).toBe(false);
            });

            it('should return false when current size exceeds limit', () => {
                const room = new Room({
                    roomId: 'room-123',
                    pin: 'hashedpin123',
                    type: 'text',
                    sizeLimit: 30,
                    title: 'Test Room'
                });

                expect(room.canAddMore(35)).toBe(false);
            });

            it('should return true when current size is 0', () => {
                const room = new Room({
                    roomId: 'room-123',
                    pin: 'hashedpin123',
                    type: 'text',
                    sizeLimit: 30,
                    title: 'Test Room'
                });

                expect(room.canAddMore(0)).toBe(true);
            });

            it('should return true when one spot left', () => {
                const room = new Room({
                    roomId: 'room-123',
                    pin: 'hashedpin123',
                    type: 'text',
                    sizeLimit: 30,
                    title: 'Test Room'
                });

                expect(room.canAddMore(29)).toBe(true);
            });
        });
    });

    describe('Field Types', () => {
        it('should store roomId as string', () => {
            const room = new Room({
                roomId: 'room-123',
                pin: 'hashedpin123',
                type: 'text',
                title: 'Test Room'
            });

            expect(typeof room.roomId).toBe('string');
        });

        it('should store sizeLimit as number', () => {
            const room = new Room({
                roomId: 'room-123',
                pin: 'hashedpin123',
                type: 'text',
                sizeLimit: 30,
                title: 'Test Room'
            });

            expect(typeof room.sizeLimit).toBe('number');
        });

        it('should store contentSizeLimit as number', () => {
            const room = new Room({
                roomId: 'room-123',
                pin: 'hashedpin123',
                type: 'text',
                contentSizeLimit: 5,
                title: 'Test Room'
            });

            expect(typeof room.contentSizeLimit).toBe('number');
        });
    });
});
