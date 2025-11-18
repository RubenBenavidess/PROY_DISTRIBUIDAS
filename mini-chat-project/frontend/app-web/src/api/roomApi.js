/**
 * API Service para llamadas HTTP a la API de salas
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

/**
 * Obtiene información detallada de una sala
 * @param {string} roomId - ID de la sala
 * @returns {Promise<Object>} Información de la sala con título, tipo, etc.
 */
export async function getRoomInfo(roomId) {
    try {
        const response = await fetch(`${API_URL}/api/rooms/${roomId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Error obteniendo información de la sala');
        }

        return data.room;
    } catch (error) {
        console.error('[API] Error obteniendo info de sala:', error);
        throw error;
    }
}
