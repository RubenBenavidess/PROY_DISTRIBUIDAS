import express from 'express';
import { createRoom, getAllRooms, getRoomInfo, deleteRoom, getRoomParticipants } from '../controllers/roomController.js';
import requireAuth from '../middleware/auth/requireAuth.js';

const router = express.Router();

/**
 * @route   POST /api/rooms
 * @desc    Create a new room (admin only)
 * @access  Protected
 */
router.post('/', requireAuth, createRoom);

/**
 * @route   GET /api/rooms
 * @desc    Get all rooms (admin only)
 * @access  Protected
 */
router.get('/', requireAuth, getAllRooms);

/**
 * @route   GET /api/rooms/:roomId/participants
 * @desc    Get room participants
 * @access  Public
 */
router.get('/:roomId/participants', getRoomParticipants);

/**
 * @route   GET /api/rooms/:roomId
 * @desc    Get room info
 * @access  Public
 */
router.get('/:roomId', getRoomInfo);

/**
 * @route   DELETE /api/rooms/:roomId
 * @desc    Delete a room (admin only)
 * @access  Protected
 */
router.delete('/:roomId', requireAuth, deleteRoom);

export default router;
