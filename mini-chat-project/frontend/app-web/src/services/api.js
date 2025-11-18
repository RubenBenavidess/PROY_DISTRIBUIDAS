import axios from 'axios';
import { useAuthStore } from '../store/authStore'; 

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Esto es crucial para enviar cookies al backend
});

// --- Servicios de Autenticación (authRouter.js) ---

/**
 * Loguea al administrador.
 * Basado en tu gateway ('/auth') y tu authRouter ('/auth/login').
 * La ruta completa es /auth/login.
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

/**
 * Verifica si hay una sesión activa (cookie válida).
 * Le pega al endpoint /auth/verify o /auth/me
 */
export const verifySession = async () => {
  try {
    const { data } = await apiClient.get('/auth/verify');
    return data; // Devuelve { success: true, user: {...} } si está autenticado
  } catch (error) {
    // Si devuelve 401 o 403, no hay sesión válida
    return { success: false };
  }
};

/**
 * Cierra la sesión del administrador (limpia la cookie).
 */
export const adminLogout = async () => {
  try {
    const { data } = await apiClient.post('/auth/logout');
    return data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error al cerrar sesión');
  }
};

// --- Servicios de Salas (roomRoutes.js) ---

/**
 * (Admin) Crea una nueva sala.
 * Le pega a POST /api/rooms (que tu gateway mapea a message-service)
 */
export const createRoom = async (roomData) => {
  // roomData debe ser { title: "...", type: "text" | "text/media" }
  // El token de admin se inyecta solo (gracias al interceptor)
  try {
    const { data } = await apiClient.post('/api/rooms', roomData);
    // El backend devuelve { success: true, roomId, pin, title, type, ... }
    return data; // Devuelve el objeto completo de la sala
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error creando la sala');
  }
};

/**
 * (Admin) Obtiene la lista de todas las salas.
 * Le pega a GET /api/rooms
 */
export const getAllRooms = async () => {
  // El token de admin se inyecta solo
  try {
    const { data } = await apiClient.get('/api/rooms');
    // El backend devuelve { success: true, rooms: [...] }
    return data.rooms || []; // Devolvemos el array de salas
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
    const { data } = await apiClient.get(`/api/rooms/${roomId}`);
    console.log('Info de la sala obtenida:', data);
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
    await apiClient.delete(`/api/rooms/${roomId}`);
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error borrando la sala');
  }
};

export default apiClient;