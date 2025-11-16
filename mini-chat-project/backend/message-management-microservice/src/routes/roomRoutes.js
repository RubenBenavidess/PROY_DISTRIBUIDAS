import express from 'express';
import roomController from '../controllers/roomController.js';
import requireAuth from '../middleware/auth/requireAuth.js';

const router = express.Router();

/**
 * @route   POST /api/rooms
 * @desc    Create a new room (admin only)
 * @access  Protected
 */
router.post('/', requireAuth, roomController.createRoom);

/**
 * @route   GET /api/rooms
 * @desc    Get all rooms (admin only)
 * @access  Protected
 */
router.get('/', requireAuth, roomController.getAllRooms);

/**
 * @route   GET /api/rooms/:roomId
 * @desc    Get room info
 * @access  Public
 */
router.get('/:roomId', roomController.getRoomInfo);

/**
 * @route   DELETE /api/rooms/:roomId
 * @desc    Delete a room (admin only)
 * @access  Protected
 */
router.delete('/:roomId', requireAuth, roomController.deleteRoom);

/**
 * @route   GET /api/rooms/:roomId/participants
 * @desc    Get room participants
 * @access  Public
 */
router.get('/:roomId/participants', roomController.getRoomParticipants);

export default router;
