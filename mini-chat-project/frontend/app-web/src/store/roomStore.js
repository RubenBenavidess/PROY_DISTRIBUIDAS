import { create } from 'zustand';

export const useRoomStore = create((set, get) => ({
  // --- ESTADO INICIAL (VACÍO) ---
  roomInfo: null,
  messages: [],
  participants: [],
  nickname: null,
  sessionId: null,
  isConnected: false, // <-- ¡VUELVE A FALSE!

  // --- Acciones (Estas quedan igual) ---

  setInitialData: (data) => {
    set({
      roomInfo: data.roomInfo,
      messages: data.messages,
      nickname: data.nickname,
      sessionId: data.sessionId,
      isConnected: true, // SÍ se conecta aquí
    });
  },

  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  setParticipants: (participants) => {
    set({ participants });
  },

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