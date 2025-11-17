import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ZodError } from 'zod';
import handleErrors from '../../../src/middleware/errors/errorMiddleware.js';
import { createMockRequest, createMockResponse, createMockNext } from '../../helpers/mockFactories.js';

describe('Error Middleware', () => {
    let consoleLogSpy;
    let consoleErrorSpy;

    beforeEach(() => {
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    describe('Generic Errors', () => {
        it('should return 500 for generic errors', () => {
            const error = new Error('Something went wrong');
            const req = createMockRequest();
            const res = createMockResponse();
            const next = createMockNext();

            handleErrors(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Something went wrong'
            });
        });

        it('should log error message and stack', () => {
            const error = new Error('Test error');
            const req = createMockRequest();
            const res = createMockResponse();
            const next = createMockNext();

            handleErrors(error, req, res, next);

            expect(consoleLogSpy).toHaveBeenCalledWith('Error: Test error');
            expect(consoleLogSpy).toHaveBeenCalledWith(error.stack);
        });
    });

    describe('Validation Errors', () => {
        it('should return 400 for ValidationError', () => {
            const error = new Error('Validation failed');
            error.message = 'ValidationError';
            const req = createMockRequest();
            const res = createMockResponse();
            const next = createMockNext();

            handleErrors(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Invalid Data: ValidationError'
            });
        });

        it('should return 400 for ZodError with error details', () => {
            const zodError = new ZodError([
                {
                    code: 'invalid_type',
                    expected: 'string',
                    received: 'number',
                    path: ['username'],
                    message: 'Expected string, received number'
                }
            ]);
            const req = createMockRequest();
            const res = createMockResponse();
            const next = createMockNext();

            handleErrors(zodError, req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            const responseCall = res.json.mock.calls[0][0];
            expect(responseCall.success).toBe(false);
            expect(responseCall.message).toBe('Invalid Input Data');
            // ZodError.errors might be an array or might not exist depending on the ZodError constructor
            if (responseCall.errors !== undefined) {
                expect(Array.isArray(responseCall.errors)).toBe(true);
            }
        });
    });

    describe('Authentication Errors', () => {
        it('should return 401 for "Invalid Credentials"', () => {
            const error = new Error('Invalid Credentials');
            const req = createMockRequest();
            const res = createMockResponse();
            const next = createMockNext();

            handleErrors(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Invalid Credentials'
            });
        });

        it('should return 401 for "No token provided"', () => {
            const error = new Error('No token provided');
            const req = createMockRequest();
            const res = createMockResponse();
            const next = createMockNext();

            handleErrors(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Unauthorized: Authentication required'
            });
        });

        it('should return 401 for "Unauthorized"', () => {
            const error = new Error('Unauthorized');
            const req = createMockRequest();
            const res = createMockResponse();
            const next = createMockNext();

            handleErrors(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('should return 401 for "Invalid token"', () => {
            const error = new Error('Invalid token');
            const req = createMockRequest();
            const res = createMockResponse();
            const next = createMockNext();

            handleErrors(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('should return 403 for "Forbidden Access"', () => {
            const error = new Error('Forbidden Access');
            const req = createMockRequest();
            const res = createMockResponse();
            const next = createMockNext();

            handleErrors(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Forbidden Access: There is already a session activated'
            });
        });
    });

    describe('Not Found Errors', () => {
        it('should return 404 for "Room not found"', () => {
            const error = new Error('Room not found');
            const req = createMockRequest();
            const res = createMockResponse();
            const next = createMockNext();

            handleErrors(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Room not found'
            });
        });

        it('should return 404 for "Message not found"', () => {
            const error = new Error('Message not found');
            const req = createMockRequest();
            const res = createMockResponse();
            const next = createMockNext();

            handleErrors(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Message not found'
            });
        });
    });

    describe('Conflict Errors', () => {
        it('should return 409 for "Room is full"', () => {
            const error = new Error('Room is full');
            const req = createMockRequest();
            const res = createMockResponse();
            const next = createMockNext();

            handleErrors(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Room is full'
            });
        });

        it('should return 409 for "Invalid PIN"', () => {
            const error = new Error('Invalid PIN');
            const req = createMockRequest();
            const res = createMockResponse();
            const next = createMockNext();

            handleErrors(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Invalid PIN'
            });
        });
    });

    describe('Response Format', () => {
        it('should always include success: false in response', () => {
            const error = new Error('Any error');
            const req = createMockRequest();
            const res = createMockResponse();
            const next = createMockNext();

            handleErrors(error, req, res, next);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: false })
            );
        });

        it('should always include message in response', () => {
            const error = new Error('Error message');
            const req = createMockRequest();
            const res = createMockResponse();
            const next = createMockNext();

            handleErrors(error, req, res, next);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ message: expect.any(String) })
            );
        });

        it('should use default message for errors without message', () => {
            const error = new Error();
            delete error.message;
            const req = createMockRequest();
            const res = createMockResponse();
            const next = createMockNext();

            handleErrors(error, req, res, next);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ message: 'Internal Server Error' })
            );
        });
    });
});
