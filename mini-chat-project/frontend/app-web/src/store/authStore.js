import { create } from 'zustand';
import { adminLogin, adminLogout } from '../services/api';

export const useAuthStore = create((set) => ({
    isAuthenticated: false, // Estado de autenticación

    /**
     * Acción: Login
     * El token se maneja en cookies (httpOnly), solo guardamos el estado
     */
    login: async (credentials) => {
        try {
            // Llama a la API (el token se guarda automáticamente en la cookie)
            const data = await adminLogin(credentials);

            if (data.success) {
                set({ isAuthenticated: true });
            } else {
                throw new Error('Respuesta de login inválida');
            }
        } catch (error) {
            set({ isAuthenticated: false });
            throw error;
        }
    },

    /**
     * Acción: Logout
     * Limpia el estado y llama al backend para limpiar la cookie
     */
    logout: async () => {
        try {
            await adminLogout(); // Llama al backend para limpiar la cookie
            set({ isAuthenticated: false });
        } catch (error) {
            // Aunque falle, limpiamos el estado local
            set({ isAuthenticated: false });
            console.error('Error al hacer logout:', error);
        }
    },

    /**
     * Acción: Setear el estado de autenticación manualmente
     * Útil cuando verificamos la sesión con el backend
     */
    setAuthenticated: (value) => {
        set({ isAuthenticated: value });
    },
}));