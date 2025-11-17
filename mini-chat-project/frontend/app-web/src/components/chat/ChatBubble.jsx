import React from 'react';
import './ChatBubble.css';

// Función para generar color basado en la primera letra
const getColorFromLetter = (letter) => {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
        '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788'
    ];
    const charCode = letter?.toUpperCase().charCodeAt(0) || 65;
    const index = (charCode - 65) % colors.length;
    return colors[index];
};

const Avatar = ({ nickname }) => {
    const initial = nickname ? nickname.charAt(0).toUpperCase() : '?';
    const bgColor = getColorFromLetter(initial);
    
    return (
        <div className="chat-avatar" style={{ backgroundColor: bgColor }}>
            <span>{initial}</span>
        </div>
    );
};

export const ChatBubble = ({ message, isMe, nickname }) => {
    const { content, timestamp, contentType, filename } = message;

    const formatTime = (ts) => {
        if (!ts) return '';
        const date = new Date(ts);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleTimeString('es-EC', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className={`chat-message-row ${isMe ? 'me' : 'other'}`}>
            {!isMe && <Avatar nickname={nickname} />}
            
            <div className="message-content">
                {!isMe && <span className="message-nickname">{nickname}</span>}
                
                <div className={`bubble ${isMe ? 'me-bubble' : 'other-bubble'}`}>
                    {contentType === 'text' ? (
                        <span className="bubble-text">{content}</span>
                    ) : (
                        <span className="bubble-file">📎 {filename || 'Archivo'}</span>
                    )}
                </div>
                
                <span className="bubble-time">{formatTime(timestamp)}</span>
            </div>
        </div>
    );
};