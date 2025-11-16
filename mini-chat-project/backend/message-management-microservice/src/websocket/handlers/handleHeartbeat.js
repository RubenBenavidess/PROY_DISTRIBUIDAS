import { sessionCache, userNicknames } from '../socketHandler.js';

/**
 * Handle heartbeat
 */
export function handleHeartbeat(socket) {
    const userInfo = userNicknames.get(socket.id);
    if (!userInfo) return;

    const { sessionId } = userInfo;
    
    // Update session TTL
    sessionCache.ttl(sessionId);
    
    // Send ack back to client
    socket.emit('heartbeat-ack', { timestamp: Date.now() });
}