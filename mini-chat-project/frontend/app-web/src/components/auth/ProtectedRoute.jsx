import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const ProtectedRoute = () => {
    // Saca el estado de autenticación del cerebro (Zustand)
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    if (!isAuthenticated) {
      // No está logueado: pal login.
      return <Navigate to="/admin/login" replace />;
    }

    // Sí está logueado: Deja que vea la página (el Dashboard).
    // Outlet es el "hueco" donde React Router pone la página protegida.
    return <Outlet />;
};

export default ProtectedRoute;