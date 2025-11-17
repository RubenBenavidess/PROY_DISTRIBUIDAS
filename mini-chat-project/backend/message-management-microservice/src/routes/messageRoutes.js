import express from 'express';
import { getLatestMessagesC } from '../controllers/messageController.js';

const router = express.Router();

/**
 * @route   GET /api/messages/:roomId
 * @desc    Get messages for a room
 * @access  Public (should verify room access)
 */
router.get('/:roomId', getLatestMessagesC);

export default router;
