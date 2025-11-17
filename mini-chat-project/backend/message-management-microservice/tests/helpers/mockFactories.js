import { jest } from '@jest/globals';

/**
 * Mock factories for creating test data
 */

export const createMockRoom = (overrides = {}) => ({
    roomId: 'test-room-id-123',
    pin: '$2b$10$testhashedpin',
    type: 'text/media',
    sizeLimit: 30,
    contentSizeLimit: 10,
    title: 'Test Room',
    createdAt: new Date(),
    updatedAt: new Date(),
    comparePin: jest.fn().mockResolvedValue(true),
    canAddMore: jest.fn().mockReturnValue(true),
    save: jest.fn().mockResolvedValue(this),
    ...overrides
});

export const createMockMessage = (overrides = {}) => ({
    _id: 'message-id-123',
    roomId: 'test-room-id-123',
    username: 'testuser',
    userIP: '127.0.0.1',
    contentType: 'text',
    content: 'Test message',
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue(this),
    ...overrides
});

export const createMockSocket = (overrides = {}) => ({
    id: 'socket-id-123',
    handshake: {
        address: '127.0.0.1',
        headers: {},
        ...overrides.handshake
    },
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
    to: jest.fn().mockReturnThis(),
    on: jest.fn(),
    ...overrides
});

export const createMockIO = (overrides = {}) => ({
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    on: jest.fn(),
    sockets: {
        sockets: new Map()
    },
    ...overrides
});

export const createMockRequest = (overrides = {}) => ({
    params: {},
    query: {},
    body: {},
    cookies: {},
    headers: {},
    user: null,
    ...overrides
});

export const createMockResponse = () => {
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        cookie: jest.fn().mockReturnThis(),
        clearCookie: jest.fn().mockReturnThis()
    };
    return res;
};

export const createMockNext = () => jest.fn();

export const createMockFileBuffer = (size = 1024) => {
    return Buffer.alloc(size, 'test data');
};

export const createMockS3Client = () => ({
    send: jest.fn().mockResolvedValue({})
});
