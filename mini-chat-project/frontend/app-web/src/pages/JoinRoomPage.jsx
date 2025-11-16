import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './JoinRoomPage.css';
import { socketService } from '../services/socketService';
import { useRoomStore } from '../store/roomStore'; // <-- 1. IMPORTA EL NUEVO STORE

const JoinRoomPage = () => {
  const [roomId, setRoomId] = useState('');
  const [pin, setPin] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const setInitialData = useRoomStore((state) => state.setInitialData); // <-- 2. SACA LA ACCIÓN

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    socketService.connect();

    try {
      // El backend devuelve: { roomInfo, messages, sessionId }
      const data = await socketService.joinRoom({ roomId, pin, nickname });

      // <-- 3. ANTES DE NAVEGAR, GUARDA TODO EN EL STORE
      setInitialData({
        roomInfo: data.roomInfo,
        messages: data.messages,
        nickname: nickname, // Guarda el nickname que usamos
        sessionId: data.sessionId,
      });

      setIsLoading(false);
      navigate(`/room/${data.roomInfo.roomId}`); // Navega (esto no cambia)

    } catch (err) {
      setIsLoading(false);
      setError(err.message || 'Error al unirse a la sala');
    }
  };

  // ... (El return se queda igual que antes)
  return (
    <div className="join-page-container">
      {/* ... (Todo tu formulario) ... */}
    </div>
  );
};

export default JoinRoomPage;