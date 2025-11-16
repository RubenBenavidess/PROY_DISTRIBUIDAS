import { create } from 'zustand';

// --- DATOS FALSOS PARA PRUEBA (IGNORA EL BACKEND) ---
const FAKE_MESSAGES = [
  {
    id: 1,
    username: 'Amigo (Fake)',
    content: 'Oe, qué tal se ve esto? Se ve lindo como la foto?',
    contentType: 'text',
    timestamp: new Date(Date.now() - 60000 * 5).toISOString(),
  },
  {
    id: 2,
    username: 'MiUsuario', // Este debe coincidir con FAKE_NICKNAME
    content: 'Se ve de ley. La paleta de colores está bacán. Esta es mi burbuja (la azul).',
    contentType: 'text',
    timestamp: new Date(Date.now() - 60000 * 4).toISOString(),
  },
  {
    id: 3,
    username: 'Amigo (Fake)',
    content: 'MiArchivoImportante.pdf',
    contentType: 'file', // Para probar el ícono 📎
    filename: 'MiArchivoImportante.pdf',
    timestamp: new Date(Date.now() - 60000 * 2).toISOString(),
  },
  {
    id: 4,
    username: 'MiUsuario', // Este debe coincidir con FAKE_NICKNAME
    content: 'Este es un mensaje largo solo para probar cómo se ajusta la burbuja cuando hay mucho texto y ver si no se daña el layout.',
    contentType: 'text',
    timestamp: new Date(Date.now() - 60000 * 1).toISOString(),
  }
];

const FAKE_NICKNAME = 'MiUsuario'; // Este es tu nombre de prueba

const FAKE_ROOM_INFO = {
  roomId: 'sala-falsa-123',
  title: 'Sala de Prueba (Hardcoded)',
  type: 'text/media', // Para que muestre el clip 📎
};
// ----------------------------------------------------

export const useRoomStore = create((set, get) => ({
  // --- ESTADO (Lleno con los datos falsos) ---
  roomInfo: FAKE_ROOM_INFO,
  messages: FAKE_MESSAGES,
  participants: [],
  nickname: FAKE_NICKNAME,
  sessionId: 'fake-session-id',
  isConnected: true, // <-- ¡LA LLAVE MÁGICA!

  // --- Acciones (Las dejamos, pero no se usan en este modo) ---

  setInitialData: (data) => {
    set({
      roomInfo: data.roomInfo,
      messages: data.messages,
      nickname: data.nickname,
      sessionId: data.sessionId,
      isConnected: true,
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