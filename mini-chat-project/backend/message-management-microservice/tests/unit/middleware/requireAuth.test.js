import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Create mock functions first
const mockValidateToken = jest.fn();

// Mock the modules before importing
jest.unstable_mockModule('../../../src/security/jwtManager.js', () => ({
    validateToken: mockValidateToken,
}));

// Now import the modules (must happen after mock setup)
const requireAuthModule = await import('../../../src/middleware/auth/requireAuth.js');
const requireAuth = requireAuthModule.default;
const { createMockRequest, createMockResponse, createMockNext } = await import('../../helpers/mockFactories.js');

describe('requireAuth Middleware', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should call next when valid token is provided', () => {
        const mockDecoded = {
            id: 'user-123',
            email: 'test@example.com',
            role: 'admin'
        };
        mockValidateToken.mockReturnValue(mockDecoded);

        const req = createMockRequest({
            cookies: { accessToken: 'valid.jwt.token' }
        });
        const res = createMockResponse();
        const next = createMockNext();

        requireAuth(req, res, next);

        expect(mockValidateToken).toHaveBeenCalledWith('valid.jwt.token');
        expect(req.user).toEqual(mockDecoded);
        expect(next).toHaveBeenCalledWith();
    });

    it('should call next with error when no token provided', () => {
        const req = createMockRequest({
            cookies: {}
        });
        const res = createMockResponse();
        const next = createMockNext();

        requireAuth(req, res, next);

        expect(mockValidateToken).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledWith(expect.any(Error));
        expect(next.mock.calls[0][0].message).toBe('No token provided');
    });

    it('should call next with error when token is undefined', () => {
        const req = createMockRequest({
            cookies: { accessToken: undefined }
        });
        const res = createMockResponse();
        const next = createMockNext();

        requireAuth(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
        expect(next.mock.calls[0][0].message).toBe('No token provided');
    });

    it('should call next with error when token is null', () => {
        const req = createMockRequest({
            cookies: { accessToken: null }
        });
        const res = createMockResponse();
        const next = createMockNext();

        requireAuth(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should call next with error when token validation fails', () => {
        const error = new Error('Invalid token');
        mockValidateToken.mockImplementation(() => { throw error; });

        const req = createMockRequest({
            cookies: { accessToken: 'invalid.token' }
        });
        const res = createMockResponse();
        const next = createMockNext();

        requireAuth(req, res, next);

        expect(mockValidateToken).toHaveBeenCalledWith('invalid.token');
        expect(next).toHaveBeenCalledWith(error);
        expect(req.user).toBeFalsy();
    });

    it('should attach decoded token to req.user', () => {
        const mockDecoded = {
            id: 'admin-456',
            role: 'admin',
            permissions: ['read', 'write']
        };
        mockValidateToken.mockReturnValue(mockDecoded);

        const req = createMockRequest({
            cookies: { accessToken: 'valid.token' }
        });
        const res = createMockResponse();
        const next = createMockNext();

        requireAuth(req, res, next);

        expect(req.user).toEqual(mockDecoded);
        expect(req.user.id).toBe('admin-456');
        expect(req.user.role).toBe('admin');
    });

    it('should handle token from cookie named accessToken', () => {
        const mockDecoded = { id: 'user-789' };
        mockValidateToken.mockReturnValue(mockDecoded);

        const req = createMockRequest({
            cookies: {
                accessToken: 'token-from-cookie',
                otherCookie: 'should-be-ignored'
            }
        });
        const res = createMockResponse();
        const next = createMockNext();

        requireAuth(req, res, next);

        expect(mockValidateToken).toHaveBeenCalledWith('token-from-cookie');
    });

    it('should not call res methods directly', () => {
        const mockDecoded = { id: 'user-123' };
        mockValidateToken.mockReturnValue(mockDecoded);

        const req = createMockRequest({
            cookies: { accessToken: 'valid.token' }
        });
        const res = createMockResponse();
        const next = createMockNext();

        requireAuth(req, res, next);

        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
    });
});
