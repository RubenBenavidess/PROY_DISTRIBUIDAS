import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { adminLogin } from '../services/api'; // Importamos la API que ya creamos

export const useAuthStore = create(
    persist(
        (set, get) => ({
        token: null,       // El JWT del admin
        // Borramos el campo "admin", tu backend no lo devuelve
        isAuthenticated: false, // ¿Está logueado?

        /**
         * Acción: Login
         * Llama a la API, y si tiene éxito, guarda el token.
         * Basado 100% en tu authService.js
         */
        login: async (credentials) => {
            try {
            // Llama a la API (api.js -> gateway -> auth-microservice)
            const data = await adminLogin(credentials);

            // Tu backend devuelve { success: true, token: "..." }
            if (data.success && data.token) {
                set({
                token: data.token,
                isAuthenticated: true,
                });
            } else {
                // Si no viene el token, algo falló
                throw new Error('Respuesta de login inválida');
            }

            } catch (error) {
            // Si el login falla (ej: "Invalid Credentials"), limpiamos todo
            set({
                token: null,
                isAuthenticated: false,
            });
            throw error; // Dejamos que la página de login muestre el error
            }
        },

        /**
         * Acción: Logout
         * Limpia el estado y el localStorage.
         */
        logout: () => {
            set({
            token: null,
            isAuthenticated: false,
            });
        },
        }),
        {
        name: 'admin-auth-storage', // Nombre en localStorage
        storage: createJSONStorage(() => localStorage),
        }
    )
);