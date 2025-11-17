import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Importa los TRES guardias
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoomAccessGuard from './components/auth/RoomAccessGuard';
import PublicRouteGuard from './components/auth/PublicRouteGuard'; // <-- EL NUEVO

// Importa las páginas
import LandingPage from './pages/LandingPage';
import AdminLoginPage from './pages/AdminLoginPage';
import JoinRoomPage from './pages/JoinRoomPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import ChatRoomPage from './pages/ChatRoomPage';

function App() {
    return (
        <BrowserRouter>
        <Routes>
            {/* Ruta de Inicio (esta no necesita guardia) */}
            <Route path="/" element={<LandingPage />} />

            {/* Rutas Públicas (Protegidas de usuarios logueados) */}
            <Route element={<PublicRouteGuard />}>
                <Route path="/join" element={<JoinRoomPage />} />
                <Route path="/admin/login" element={<AdminLoginPage />} />
            </Route>
            
            {/* Rutas Protegidas (Admin) */}
            <Route element={<ProtectedRoute />}>
                <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            </Route>

            {/* Ruta Protegida (Usuario de Chat) */}
            <Route element={<RoomAccessGuard />}>
                <Route path="/room/:roomId" element={<ChatRoomPage />} />
            </Route>
            
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </BrowserRouter>
    );
}

export default App;