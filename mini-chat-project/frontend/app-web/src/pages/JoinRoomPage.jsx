import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/button';
import './JoinRoomPage.css';
import { socketService } from '../services/socketService';
import { useRoomStore } from '../store/roomStore';

const JoinRoomPage = () => {
  const [roomId, setRoomId] = useState('');
  const [pin, setPin] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const setInitialData = useRoomStore((state) => state.setInitialData);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    socketService.connect();

    try {
      const data = await socketService.joinRoom({ roomId, pin, nickname });
      setInitialData({
        roomInfo: data.roomInfo,
        messages: data.messages,
        nickname: nickname,
        sessionId: data.sessionId,
      });
      setIsLoading(false);
      navigate(`/room/${data.roomInfo.roomId}`);
    } catch (err) {
      setIsLoading(false);
      setError(err.message || 'Error al unirse a la sala');
    }
  };

  return (
    <div className="join-page-container">
      <div className="join-form-wrapper">
        <h1 className="join-title">Unirse a la Sala</h1>
        <p className="join-subtitle">Ingresa los datos para acceder al chat.</p>
        <form onSubmit={handleSubmit}>
          <Input
            label="Room ID"
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="El ID de la sala"
          />
          <Input
            label="PIN de sala"
            type="text"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="El PIN de 4 dígitos"
          />
          <Input
            label="Nickname"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Tu alias en el chat"
          />
          {error && <div className="error-message">{error}</div>}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Entrando...' : 'Entrar al Chat'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default JoinRoomPage;