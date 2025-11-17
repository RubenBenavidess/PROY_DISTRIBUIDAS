import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Create mock functions first
const mockCreateRoomService = jest.fn();
const mockGetRoomInfoService = jest.fn();
const mockGetAllRoomsService = jest.fn();
const mockDeleteRoomService = jest.fn();
const mockGetRoomParticipantsService = jest.fn();

// Mock the module before importing
jest.unstable_mockModule('../../../src/services/roomService.js', () => ({
    createRoom: mockCreateRoomService,
    getRoomInfo: mockGetRoomInfoService,
    getAllRooms: mockGetAllRoomsService,
    deleteRoom: mockDeleteRoomService,
    getRoomParticipants: mockGetRoomParticipantsService,
}));

// Now import the modules (must happen after mock setup)
const {
    createRoom,
    getRoomInfo,
    getAllRooms,
    deleteRoom,
    getRoomParticipants
} = await import('../../../src/controllers/roomController.js');
const { createMockRequest, createMockResponse, createMockNext } = await import('../../helpers/mockFactories.js');

describe('Room Controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createRoom', () => {
        it('should create room successfully with authenticated user', async () => {
            const mockResult = {
                success: true,
                roomId: 'room-123',
                pin: '123456',
                type: 'text',
                sizeLimit: 30,
                title: 'Test Room',
                contentSizeLimit: 5
            };
            mockCreateRoomService.mockResolvedValue(mockResult);

            const req = createMockRequest({
                body: {
                    title: 'Test Room',
                    type: 'text',
                    sizeLimit: 30,
                    contentSizeLimit: 5
                },
                user: { id: 'admin-123' }
            });
            const res = createMockResponse();
            const next = createMockNext();

            await createRoom(req, res, next);

            expect(mockCreateRoomService).toHaveBeenCalledWith({
                title: 'Test Room',
                type: 'text',
                sizeLimit: 30,
                contentSizeLimit: 5,
                adminId: 'admin-123'
            });
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(mockResult);
        });

        it('should use "system" as adminId when user not authenticated', async () => {
            const mockResult = { success: true, roomId: 'room-123' };
            mockCreateRoomService.mockResolvedValue(mockResult);

            const req = createMockRequest({
                body: { title: 'Test', type: 'text' }
            });
            const res = createMockResponse();
            const next = createMockNext();

            await createRoom(req, res, next);

            expect(mockCreateRoomService).toHaveBeenCalledWith(
                expect.objectContaining({ adminId: 'system' })
            );
        });

        it('should call next with error when service fails', async () => {
            const error = new Error('Creation failed');
            mockCreateRoomService.mockRejectedValue(error);

            const req = createMockRequest({
                body: { title: 'Test', type: 'text' },
                user: { id: 'admin-123' }
            });
            const res = createMockResponse();
            const next = createMockNext();

            await createRoom(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    describe('getRoomInfo', () => {
        it('should return room info successfully', async () => {
            const mockRoom = {
                roomId: 'room-123',
                title: 'Test Room',
                type: 'text',
                sizeLimit: 30
            };
            mockGetRoomInfoService.mockResolvedValue(mockRoom);

            const req = createMockRequest({
                params: { roomId: 'room-123' }
            });
            const res = createMockResponse();
            const next = createMockNext();

            await getRoomInfo(req, res, next);

            expect(mockGetRoomInfoService).toHaveBeenCalledWith('room-123');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                room: mockRoom
            });
        });

        it('should call next with error when room not found', async () => {
            const error = new Error('Room not found');
            mockGetRoomInfoService.mockRejectedValue(error);

            const req = createMockRequest({
                params: { roomId: 'nonexistent' }
            });
            const res = createMockResponse();
            const next = createMockNext();

            await getRoomInfo(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });

    describe('getAllRooms', () => {
        it('should return all rooms successfully', async () => {
            const mockRooms = [
                { roomId: 'room-1', title: 'Room 1' },
                { roomId: 'room-2', title: 'Room 2' }
            ];
            mockGetAllRoomsService.mockResolvedValue(mockRooms);

            const req = createMockRequest();
            const res = createMockResponse();
            const next = createMockNext();

            await getAllRooms(req, res, next);

            expect(mockGetAllRoomsService).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                rooms: mockRooms
            });
        });

        it('should return empty array when no rooms exist', async () => {
            mockGetAllRoomsService.mockResolvedValue([]);

            const req = createMockRequest();
            const res = createMockResponse();
            const next = createMockNext();

            await getAllRooms(req, res, next);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                rooms: []
            });
        });

        it('should call next with error when service fails', async () => {
            const error = new Error('Database error');
            mockGetAllRoomsService.mockRejectedValue(error);

            const req = createMockRequest();
            const res = createMockResponse();
            const next = createMockNext();

            await getAllRooms(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });

    describe('deleteRoom', () => {
        it('should delete room successfully', async () => {
            const mockResult = {
                success: true,
                message: 'Room deleted successfully'
            };
            mockDeleteRoomService.mockResolvedValue(mockResult);

            const req = createMockRequest({
                params: { roomId: 'room-123' }
            });
            const res = createMockResponse();
            const next = createMockNext();

            await deleteRoom(req, res, next);

            expect(mockDeleteRoomService).toHaveBeenCalledWith('room-123');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockResult);
        });

        it('should call next with error when deletion fails', async () => {
            const error = new Error('Room not found');
            mockDeleteRoomService.mockRejectedValue(error);

            const req = createMockRequest({
                params: { roomId: 'nonexistent' }
            });
            const res = createMockResponse();
            const next = createMockNext();

            await deleteRoom(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });

    describe('getRoomParticipants', () => {
        it('should return room participants successfully', async () => {
            const mockParticipants = [
                { socketId: 'socket-1', nickname: 'user1' },
                { socketId: 'socket-2', nickname: 'user2' }
            ];
            mockGetRoomParticipantsService.mockResolvedValue(mockParticipants);

            const req = createMockRequest({
                params: { roomId: 'room-123' }
            });
            const res = createMockResponse();
            const next = createMockNext();

            await getRoomParticipants(req, res, next);

            expect(mockGetRoomParticipantsService).toHaveBeenCalledWith('room-123');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                count: 2,
                participants: mockParticipants
            });
        });

        it('should return empty participants array when room is empty', async () => {
            mockGetRoomParticipantsService.mockResolvedValue([]);

            const req = createMockRequest({
                params: { roomId: 'room-123' }
            });
            const res = createMockResponse();
            const next = createMockNext();

            await getRoomParticipants(req, res, next);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                count: 0,
                participants: []
            });
        });

        it('should call next with error when service fails', async () => {
            const error = new Error('Service error');
            mockGetRoomParticipantsService.mockRejectedValue(error);

            const req = createMockRequest({
                params: { roomId: 'room-123' }
            });
            const res = createMockResponse();
            const next = createMockNext();

            await getRoomParticipants(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });
});
