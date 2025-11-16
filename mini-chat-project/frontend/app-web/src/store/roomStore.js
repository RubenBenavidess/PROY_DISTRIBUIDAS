import { create } from 'zustand';

export const useRoomStore = create((set, get) => ({
    // Estado
    roomInfo: null,
    messages: [],
    participants: [],
    nickname: null, // El nickname con el que entramos
    sessionId: null,
    isConnected: false,

    // --- Acciones ---

    /**
     * Guarda la data inicial cuando nos unimos (desde JoinRoomPage)
     */
    setInitialData: (data) => {
        set({
        roomInfo: data.roomInfo,
        messages: data.messages,
        nickname: data.nickname,
        sessionId: data.sessionId,
        isConnected: true,
        });
    },

    /**
     * Añade un mensaje nuevo (desde el listener de socket)
     */
    addMessage: (message) => {
        set((state) => ({
        messages: [...state.messages, message],
        }));
    },

    /**
     * Actualiza la lista de participantes
     */
    setParticipants: (participants) => {
        set({ participants });
    },

    /**
     * Limpia todo cuando salimos de la sala
     */
    clearRoom: () => {
        set({
        roomInfo: null,
        messages: [],
        participants: [],
        nickname: null,
        sessionId: null,
        isConnected: false,
        });
    },
}));