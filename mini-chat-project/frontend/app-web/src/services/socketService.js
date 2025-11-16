import { io } from 'socket.io-client';

// OJO: Esta URL es la del microservicio de mensajes DIRECTAMENTE.
// Tu gateway no parece proxear WebSockets.
const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
class SocketService {
    socket = null;

    connect(token) {
        // Conectamos al socket (aún no nos unimos a una sala)
        this.socket = io(SOCKET_URL, {
            // AÑADIMOS EL "PATH" QUE COINCIDE CON LA REGLA DEL PROXY
            path: '/api/socket.io/',
        });

        this.socket.on('connect', () => {
            console.log('Socket conectado:', this.socket.id);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('Socket desconectado:', reason);
        });

        this.socket.on('connect_error', (err) => {
            console.error('Socket error de conexión:', err.message);
        });
    }

    disconnect() {
        if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
        }
    }

    /**
     * Wrapper para los eventos que vienen del servidor (ej: 'new-message')
     */
    listen(eventName, callback) {
        if (!this.socket) this.connect();
        this.socket.on(eventName, callback);
    }

    /**
     * Wrapper para dejar de escuchar
     */
    stopListening(eventName, callback) {
        if (!this.socket) return;
        this.socket.off(eventName, callback);
    }

    /**
     * Wrapper para emitir eventos al servidor (ej: 'typing')
     */
    emit(eventName, data) {
        if (!this.socket) return;
        this.socket.emit(eventName, data);
    }

    /**
     * Wrapper para eventos que usan un callback de Acknowledge
     * (Tu backend usa callbacks para todo, esto es clave)
     *
     * @param {string} eventName
     * @param {object} data
     * @returns {Promise<any>}
     */
    request(eventName, data) {
        if (!this.socket) {
        return Promise.reject('No socket connection');
        }

        return new Promise((resolve, reject) => {
        // Usamos un timeout por si el server no responde
        const timeout = setTimeout(() => {
            reject(new Error(`Socket event ${eventName} timed out`));
        }, 10000); // 10 segundos

        this.socket.emit(eventName, data, (response) => {
            clearTimeout(timeout);
            if (response && response.success) {
            resolve(response);
            } else {
            reject(new Error(response?.error || `Error en el evento ${eventName}`));
            }
        });
        });
    }

    // --- Eventos Específicos (basados en tu socketHandler.js) ---

    /**
     * Intenta unirse a una sala.
     * Requisito Funcional 3
     * @param {object} data - { roomId, pin, nickname }
     */
    joinRoom(data) {
        // data debe ser: { roomId, pin, nickname }
        return this.request('join-room', data);
        // Esto devuelve una Promesa que resuelve con:
        // { success: true, sessionId, roomInfo: {...}, messages: [...] }
    }

    /**
     * Envía un mensaje de texto.
     * @param {string} content
     */
    sendMessage(content) {
        return this.request('send-message', { content });
        // Esto devuelve: { success: true, messageId, timestamp }
    }

    /**
     * Envía un archivo.
     * @param {File} file - El objeto File del input
     */
    async sendFile(file) {
        // Tu backend espera un buffer, así que lo convertimos
        const fileBuffer = await file.arrayBuffer();

        const data = {
        fileBuffer,
        mimeType: file.type,
        filename: file.name,
        };

        return this.request('send-file', data);
        // Devuelve: { success: true, hash, timestamp }
    }

    /**
     * Emite el evento de 'typing' (sin callback)
     */
    sendTyping(isTyping) {
        this.emit('typing', { isTyping });
    }

    /**
     * Obtiene la lista de participantes (usa callback)
     */
    getParticipants() {
        return this.request('get-participants', {});
    }

    /**
     * Abandona la sala (usa callback)
     */
    leaveRoom() {
        return this.request('leave-room', {});
    }
}

// Exportamos una sola instancia (Singleton)
export const socketService = new SocketService();