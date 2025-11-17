import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const PublicRouteGuard = () => {
  // Saca el estado de autenticación del cerebro (Zustand)
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    if (isAuthenticated) {
        return <Navigate to="/admin/dashboard" replace />;
    }

    return <Outlet />;
};

export default PublicRouteGuard;