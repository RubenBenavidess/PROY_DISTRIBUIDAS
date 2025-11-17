/**
 * Hash a nickname for a specific room using SHA-256
 * This mimics the backend's hashNicknameForRoom function
 * @param {string} nickname - User's nickname
 * @param {string} roomId - Room ID
 * @returns {Promise<string>} Deterministic hash (first 16 chars)
 */
export async function hashNicknameForRoom(nickname, roomId) {
    const combined = `${nickname}:${roomId}`;
    
    // Use Web Crypto API (available in modern browsers)
    const encoder = new TextEncoder();
    const data = encoder.encode(combined);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Return first 16 characters (like backend)
    return hashHex.substring(0, 16);
}
