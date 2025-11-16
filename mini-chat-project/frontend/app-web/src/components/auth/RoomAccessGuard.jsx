import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useRoomStore } from '../../store/roomStore'; // OJO: usa el roomStore

const RoomAccessGuard = () => {
  // Saca el estado de conexión del cerebro (roomStore)
  const isConnected = useRoomStore((state) => state.isConnected);

  if (!isConnected) {
    // ❌ No está en una sala: Lo botamos a la página de "Unirse".
    return <Navigate to="/join" replace />;
  }

  // ✅ Sí está en una sala: Deja que vea el chat.
  return <Outlet />;
};

export default RoomAccessGuard;