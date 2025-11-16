import { getLatestMessages } from '../services/messageService.js';

/**
 * Get latest n messages for a room
 * With pagination support
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function getLatestMessages(req, res, next) {
    try {
        const { roomId } = req.params;
        const { numberOfMessages, skip } = req.query;

        const messages = await getLatestMessages(roomId, {
            limit: parseInt(numberOfMessages) || 50,
            skip: parseInt(skip) || 0
        });

        res.status(200).json({
            messages,
        });
    } catch (error) {
        next(error);
    }
}
