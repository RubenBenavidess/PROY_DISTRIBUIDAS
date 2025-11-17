import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoomStore } from '../store/roomStore';
import { socketService } from '../services/socketService';

import { ChatBubble } from '../components/chat/ChatBubble';
import { MessageInput } from '../components/chat/MessageInput';
import './ChatRoomPage.css';

const ChatRoomPage = () => {
    const navigate = useNavigate();
    const chatBodyRef = useRef(null); // Ref para hacer scroll automático

    // Saca toda la data del "cerebro" (roomStore)
    const roomInfo = useRoomStore((state) => state.roomInfo);
    const messages = useRoomStore((state) => state.messages);
    const nickname = useRoomStore((state) => state.nickname);
    const sessionId = useRoomStore((state) => state.sessionId);
    const isConnected = useRoomStore((state) => state.isConnected);
    
    // Leemos las acciones (funciones) del store
    const addMessage = useRoomStore((state) => state.addMessage);
    const clearRoom = useRoomStore((state) => state.clearRoom);

    // --- VERIFICAR SI TENEMOS DATOS VÁLIDOS ---
    useEffect(() => {
        if (!roomInfo || !sessionId || !nickname) {
            console.warn('No room data found, redirecting to join page');
            navigate('/join', { replace: true });
        }
    }, [roomInfo, sessionId, nickname, navigate]);

    // --- EFECTO 1: Escuchar Sockets y Manejar Salida ---
    useEffect(() => {
        if (!roomInfo || !sessionId) return; // No hacer nada si no hay datos

        // --- Suscribirse a eventos del socket ---
        const handleNewMessage = (msg) => {
            console.log('Nuevo mensaje recibido:', msg);
            addMessage(msg);
        };
        
        const handleNewFile = (fileMsg) => {
            console.log('Nuevo archivo recibido:', fileMsg);
            addMessage(fileMsg);
        };
        
        socketService.listen('new-message', handleNewMessage);
        socketService.listen('new-file', handleNewFile);

        // --- Función de LIMPIEZA ---
        return () => {
            socketService.stopListening('new-message', handleNewMessage);
            socketService.stopListening('new-file', handleNewFile);
        };
    }, [roomInfo, sessionId, addMessage]);

    // --- EFECTO 2: Scroll automático al fondo ---
    useEffect(() => {
        if (chatBodyRef.current) {
        chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [messages]); // Se ejecuta cada vez que llega un mensaje

    // --- Funciones para mandar datos ---
    const handleSendMessage = (text) => {
        socketService.sendMessage(text)
            .catch(err => console.error("Error enviando mensaje:", err));
    };

    const handleSendFile = (file) => {
        socketService.sendFile(file)
            .catch(err => console.error("Error enviando archivo:", err));
    };

    // --- Función para salir de la sala ---
    const handleLeaveRoom = async () => {
        try {
            await socketService.leaveRoom();
        } catch (err) {
            console.error('Error leaving room:', err);
        } finally {
            clearRoom();
            socketService.disconnect();
            navigate('/join', { replace: true });
        }
    };

    // Si no hay info (aún cargando o error), no muestra nada
    if (!roomInfo) {
        return null; // O un <LoadingSpinner />
    }
    
    // Requisito: El clip solo si el tipo de sala lo permite
    const showAttachButton = roomInfo.type === 'text/media';

    return (
        <div className="chat-layout">
        {/* Columna 1: Chat (Versión Desktop: 2 Columnas) */}
        <div className="chat-column">
            
            {/* Header (Tu Spec) */}
            <header className="chat-header">
                <div className="header-info">
                    <h2>{roomInfo.title}</h2>
                    <span><span className="lock-icon">🔒</span> Cifrado</span>
                </div>
                <button onClick={handleLeaveRoom} className="leave-button">
                    Salir
                </button>
            </header>

            {/* Cuerpo del Chat */}
            <div className="chat-body" ref={chatBodyRef}>
            {messages.map((msg, index) => (
                <ChatBubble
                key={msg.id || index}
                message={msg}
                // Compara el 'username' del mensaje con el 'nickname' guardado
                isMe={msg.username === nickname}
                />
            ))}
            </div>
            
            {/* Input */}
            <MessageInput
            onSendMessage={handleSendMessage}
            onSendFile={handleSendFile}
            showAttach={showAttachButton}
            />
        </div>

        {/* Columna 2: Detalles (Tu Spec - Solo Desktop) */}
        <aside className="details-column">
            <h3>Usuarios Conectados</h3>
            {/* (Aquí iría el UserList. Faltaría implementar la lógica de 'get-participants') */}
            <p>{nickname} (Tú)</p>            
            {showAttachButton && (
            <>
                <hr />
                <h3>Archivos</h3>
                {/* (Aquí iría la galería de archivos) */}
                <p>No hay archivos.</p>
            </>
            )}
        </aside>
        </div>
    );
};

export default ChatRoomPage;