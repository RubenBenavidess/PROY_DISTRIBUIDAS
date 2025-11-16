import express from 'express';
import { getLatestMessages } from '../controllers/messageController.js';

const router = express.Router();

/**
 * @route   GET /api/messages/:roomId
 * @desc    Get messages for a room
 * @access  Public (should verify room access)
 */
router.get('/:roomId', getLatestMessages);

export default router;
