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
    const {
        roomInfo,
        messages,
        nickname,
        isConnected,
        addMessage,
        clearRoom
    } = useRoomStore((state) => ({
        roomInfo: state.roomInfo,
        messages: state.messages,
        nickname: state.nickname,
        isConnected: state.isConnected,
        addMessage: state.addMessage,
        clearRoom: state.clearRoom,
    }));

    // --- EFECTO 1: Escuchar Sockets y Manejar Salida ---
    useEffect(() => {

        // --- Suscribirse a eventos del socket ---
        const handleNewMessage = (msg) => {
        addMessage(msg);
        };
        const handleNewFile = (fileMsg) => {
        addMessage(fileMsg); // Tu backend los manda con estructura similar
        };
        
        // (Añade 'user-joined', 'user-left' si los necesitas)
        
        socketService.listen('new-message', handleNewMessage);
        socketService.listen('new-file', handleNewFile);

        // --- Función de LIMPIEZA ---
        // Esto se ejecuta cuando el componente se destruye (sales de la página)
        return () => {
        // Deja de escuchar
        socketService.stopListening('new-message', handleNewMessage);
        socketService.stopListening('new-file', handleNewFile);
        
        // Abandona la sala y limpia el store
        socketService.leaveRoom();
        clearRoom();
        };
    }, [isConnected, navigate, addMessage, clearRoom]);

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
            {/* (Aquí iría el botón de usuarios en móvil) */}
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
            <p>Usuario 2 (Placeholder)</p>
            
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