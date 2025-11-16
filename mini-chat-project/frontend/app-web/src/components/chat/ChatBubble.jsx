import React from 'react';
import './ChatBubble.css';

/**
 * @param {object} props
 * @param {object} props.message - El objeto del mensaje
 * @param {boolean} props.isMe - Si el mensaje es mío (para el color)
 */
export const ChatBubble = ({ message, isMe }) => {
    const { username, content, timestamp, contentType, filename } = message;

    // Formatea la hora
    const formatTime = (ts) => {
        return new Date(ts).toLocaleTimeString('es-EC', {
        hour: '2-digit',
        minute: '2-digit',
        });
    };

    return (
        <div className={`bubble-container ${isMe ? 'me' : 'other'}`}>
        <div className="bubble">
            {!isMe && <div className="bubble-username">{username}</div>}
            
            {/* Muestra contenido de texto o un link de archivo */}
            {contentType === 'text' ? (
            <div className="bubble-content">{content}</div>
            ) : (
            <div className="bubble-content file">
                📎 {filename || 'Archivo'}
                {/* Aquí iría un link de descarga si la API lo diera */}
            </div>
            )}
            
            <div className="bubble-timestamp">{formatTime(timestamp)}</div>
        </div>
        </div>
    );
};