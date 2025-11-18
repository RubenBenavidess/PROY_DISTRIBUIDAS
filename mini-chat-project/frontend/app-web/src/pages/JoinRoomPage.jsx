import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/button';
import './JoinRoomPage.css';
import { socketService } from '../services/socketService';
import { useRoomStore } from '../store/roomStore';
import { hashNicknameForRoom } from '../utils/crypto';
import { cryptoService } from '../utils/cryptoService';

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
    
    // Validar campos
    if (!roomId || !pin || !nickname) {
      setError('Todos los campos son requeridos');
      setIsLoading(false);
      return;
    }

    try {
      // Conectar socket antes de unirse
      socketService.connect();
      
      console.log('Intentando unirse a la sala:', { roomId, pin, nickname });
      
      // 🔐 PASO 1: Generar par de claves RSA para firma digital
      console.log('🔐 Generando claves RSA...');
      await cryptoService.generateRSAKeyPair();
      
      // 🔑 PASO 2: Derivar clave AES de la sala (E2EE)
      console.log('🔑 Derivando clave AES de la sala...');
      await cryptoService.deriveAESKey(roomId, pin);
      
      // Calcular el hash del nickname (igual que el backend)
      const hashedNickname = await hashNicknameForRoom(nickname, roomId);
      console.log('Nickname hasheado:', hashedNickname);
      
      // Intentar unirse a la sala
      const data = await socketService.joinRoom({ roomId, pin, nickname });
      
      console.log('Respuesta de joinRoom:', data);
      
      // 🔓 PASO 3: Desencriptar mensajes históricos
      console.log('🔓 Desencriptando mensajes históricos...');
      const decryptedMessages = await Promise.all(
        data.messages.map(async (msg) => {
          // Solo desencriptar mensajes de texto que tengan contenido encriptado
          if (msg.contentType === 'text' && msg.content) {
            try {
              // Verificar firma si existe
              if (msg.signature && msg.publicKey) {
                const isValid = await cryptoService.verifySignature(
                  msg.content,
                  msg.signature,
                  msg.publicKey
                );
                if (!isValid) {
                  console.warn('⚠️ Firma inválida en mensaje histórico:', msg.id);
                  return {
                    ...msg,
                    content: '[⚠️ FIRMA INVÁLIDA]'
                  };
                }
              }
              
              // Desencriptar contenido
              const decryptedContent = await cryptoService.decryptMessage(msg.content);
              return {
                ...msg,
                content: decryptedContent
              };
            } catch (err) {
              console.error('Error desencriptando mensaje histórico:', msg.id, err);
              return {
                ...msg,
                content: '[❌ Error al desencriptar]'
              };
            }
          }
          // Si no es un mensaje de texto, devolverlo sin cambios (archivos, etc)
          return msg;
        })
      );
      
      console.log(`✅ ${decryptedMessages.length} mensajes desencriptados`);
      
      // Guardar datos en el store (con mensajes desencriptados)
      setInitialData({
        roomInfo: data.roomInfo,
        messages: decryptedMessages, // Mensajes ya desencriptados
        nickname: nickname, // Nickname original para mostrar
        hashedNickname: hashedNickname, // Hash para comparar con mensajes
        sessionId: data.sessionId,
      });
      
      setIsLoading(false);
      
      // Navegar a la sala
      console.log('Navegando a:', `/room/${data.roomInfo.roomId}`);
      navigate(`/room/${data.roomInfo.roomId}`);
      
    } catch (err) {
      console.error('Error al unirse a la sala:', err);
      setIsLoading(false);
      setError(err.message || 'Error al unirse a la sala. Verifica los datos e intenta de nuevo.');
      // Limpiar claves en caso de error
      cryptoService.clearKeys();
      // Desconectar el socket en caso de error
      socketService.disconnect();
    }
  };

  return (
    <div className="join-page-container">
      {/* Botón para volver atrás */}
        <button 
          className="back-button" 
          onClick={() => navigate('/')}
          type="button"
        >
          ← Volver
        </button>
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