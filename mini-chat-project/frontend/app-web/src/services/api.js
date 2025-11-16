import axios from 'axios';
import { useAuthStore } from '../store/authStore'; 

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/*
 * INTERCEPTOR:
 * Antes de cada petición, revisa el store.
 * Si hay un token de admin, lo inyecta en la cabecera.
 * Así las rutas protegidas (como crear sala) funcionan solas.
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token; // Saca el token del store
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- Servicios de Autenticación (authRouter.js) ---

/**
 * Loguea al administrador.
 * Basado en tu gateway ('/auth') y tu authRouter ('/auth/login').
 * La ruta completa es /auth/auth/login.
 */
export const adminLogin = async (credentials) => {
  try {
    // credentials debe ser { username: "...", password: "..." }
    const { data } = await apiClient.post('/auth/login', credentials);
    // Asumo que devuelve { token, admin: {...} }
    return data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error en el login');
  }
};

// --- Servicios de Salas (roomRoutes.js) ---

/**
 * (Admin) Crea una nueva sala.
 * Le pega a POST /api/ (que tu gateway mapea a message-service)
 */
export const createRoom = async (roomData) => {
  // roomData debe ser { title: "...", type: "text" | "text/media" }
  // El token de admin se inyecta solo (gracias al interceptor)
  try {
    const { data } = await apiClient.post('/api/', roomData);
    return data; // Devuelve la sala recién creada
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error creando la sala');
  }
};

/**
 * (Admin) Obtiene la lista de todas las salas.
 * Le pega a GET /api/
 */
export const getAllRooms = async () => {
  // El token de admin se inyecta solo
  try {
    const { data } = await apiClient.get('/api/');
    return data; // Devuelve un array de salas
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error obteniendo las salas');
  }
};

/**
 * (Público) Obtiene info de una sala específica.
 * Le pega a GET /api/:roomId
 */
export const getRoomInfo = async (roomId) => {
  try {
    const { data } = await apiClient.get(`/api/${roomId}`);
    return data; // Devuelve { room: {...} }
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error obteniendo info de la sala');
  }
};

/**
 * (Admin) Borra una sala.
 * Le pega a DELETE /api/:roomId
 */
export const deleteRoom = async (roomId) => {
  // El token de admin se inyecta solo
  try {
    await apiClient.delete(`/api/${roomId}`);
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error borrando la sala');
  }
};

export default apiClient;