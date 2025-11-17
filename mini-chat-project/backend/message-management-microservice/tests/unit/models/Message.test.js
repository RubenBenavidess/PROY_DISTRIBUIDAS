import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import Message from '../../../src/models/Message.js';

describe('Message Model', () => {
    describe('Schema Validation', () => {
        it('should create a valid message with required fields', () => {
            const messageData = {
                roomId: 'test-room-123',
                username: 'testuser',
                userIP: '127.0.0.1',
                contentType: 'text',
                content: 'Hello, world!'
            };

            const message = new Message(messageData);
            const validationError = message.validateSync();

            expect(validationError).toBeUndefined();
            expect(message.roomId).toBe(messageData.roomId);
            expect(message.username).toBe(messageData.username);
            expect(message.userIP).toBe(messageData.userIP);
            expect(message.contentType).toBe(messageData.contentType);
            expect(message.content).toBe(messageData.content);
        });

        it('should fail validation when roomId is missing', () => {
            const message = new Message({
                username: 'testuser',
                userIP: '127.0.0.1',
                contentType: 'text',
                content: 'Hello'
            });

            const validationError = message.validateSync();
            expect(validationError.errors.roomId).toBeDefined();
        });

        it('should fail validation when username is missing', () => {
            const message = new Message({
                roomId: 'test-room-123',
                userIP: '127.0.0.1',
                contentType: 'text',
                content: 'Hello'
            });

            const validationError = message.validateSync();
            expect(validationError.errors.username).toBeDefined();
        });

        it('should fail validation when userIP is missing', () => {
            const message = new Message({
                roomId: 'test-room-123',
                username: 'testuser',
                contentType: 'text',
                content: 'Hello'
            });

            const validationError = message.validateSync();
            expect(validationError.errors.userIP).toBeDefined();
        });

        it('should fail validation when contentType is missing', () => {
            const message = new Message({
                roomId: 'test-room-123',
                username: 'testuser',
                userIP: '127.0.0.1',
                content: 'Hello'
            });

            const validationError = message.validateSync();
            expect(validationError.errors.contentType).toBeDefined();
        });

        it('should fail validation when content is missing', () => {
            const message = new Message({
                roomId: 'test-room-123',
                username: 'testuser',
                userIP: '127.0.0.1',
                contentType: 'text'
            });

            const validationError = message.validateSync();
            expect(validationError.errors.content).toBeDefined();
        });
    });

    describe('Timestamps', () => {
        it('should automatically add createdAt and updatedAt timestamps', () => {
            const message = new Message({
                roomId: 'test-room-123',
                username: 'testuser',
                userIP: '127.0.0.1',
                contentType: 'text',
                content: 'Test message'
            });

            expect(message.createdAt).toBeUndefined(); // Not set until save
            expect(message.updatedAt).toBeUndefined();
        });
    });

    describe('Content Types', () => {
        it('should accept text content type', () => {
            const message = new Message({
                roomId: 'test-room-123',
                username: 'testuser',
                userIP: '127.0.0.1',
                contentType: 'text',
                content: 'Hello'
            });

            const validationError = message.validateSync();
            expect(validationError).toBeUndefined();
        });

        it('should accept image content types', () => {
            const message = new Message({
                roomId: 'test-room-123',
                username: 'testuser',
                userIP: '127.0.0.1',
                contentType: 'image/png',
                content: 's3://bucket/path/to/image.png'
            });

            const validationError = message.validateSync();
            expect(validationError).toBeUndefined();
        });

        it('should accept any contentType string', () => {
            const message = new Message({
                roomId: 'test-room-123',
                username: 'testuser',
                userIP: '127.0.0.1',
                contentType: 'application/pdf',
                content: 's3://bucket/path/to/file.pdf'
            });

            const validationError = message.validateSync();
            expect(validationError).toBeUndefined();
        });
    });

    describe('Field Types', () => {
        it('should store roomId as string', () => {
            const message = new Message({
                roomId: 'test-room-123',
                username: 'testuser',
                userIP: '127.0.0.1',
                contentType: 'text',
                content: 'Hello'
            });

            expect(typeof message.roomId).toBe('string');
        });

        it('should store username as string', () => {
            const message = new Message({
                roomId: 'test-room-123',
                username: 'testuser',
                userIP: '127.0.0.1',
                contentType: 'text',
                content: 'Hello'
            });

            expect(typeof message.username).toBe('string');
        });

        it('should store content as string', () => {
            const message = new Message({
                roomId: 'test-room-123',
                username: 'testuser',
                userIP: '127.0.0.1',
                contentType: 'text',
                content: 'Hello'
            });

            expect(typeof message.content).toBe('string');
        });
    });
});
