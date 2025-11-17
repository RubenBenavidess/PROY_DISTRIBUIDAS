import React from 'react';
import './ChatBubble.css';

// Función para generar un color aleatorio consistente basado en el username
const getColorFromUsername = (username) => {
    if (!username) return '#9E9E9E';
    
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
        '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
        '#F8B739', '#52B788', '#E76F51', '#2A9D8F',
        '#E63946', '#457B9D', '#1D3557', '#F77F00'
    ];
    
    // Generar un hash simple del username
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Usar el hash para seleccionar un color
    const index = Math.abs(hash) % colors.length;
    return colors[index];
};

const Avatar = ({ username }) => {
    const initial = username ? username.substring(0, 1).toUpperCase() : '?';
    const backgroundColor = getColorFromUsername(username);
    
    return (
        <div className="chat-avatar" style={{ backgroundColor }}>
            <span>{initial}</span>
        </div>
    );
};

export const ChatBubble = ({ message, isMe }) => {
    const { username, content, timestamp, contentType, filename } = message;

    // DEBUG: Ver qué está llegando
    console.log('ChatBubble mensaje:', { contentType, filename, content: content?.substring(0, 100) });

    // Mostrar un nombre más amigable para el usuario
    const displayName = isMe ? 'Tú' : `Usuario ${username?.substring(0, 6) || 'Desconocido'}`;

    const formatTime = (ts) => {
        if (!ts) return '';
        const date = new Date(ts);
        if (isNaN(date.getTime())) {
            return '';
        }
        return date.toLocaleTimeString('es-EC', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Determinar si el contenido es una imagen
    const isImage = contentType && (
        contentType.startsWith('image/') || 
        contentType === 'image' ||
        contentType === 'application/octet-stream' && filename && /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(filename)
    );

    // Determinar si el contenido es un archivo descargable
    const isFile = contentType && contentType !== 'text' && !isImage;

    // Extraer nombre del archivo de la URL si no viene en filename
    const getFilename = () => {
        if (filename) return filename;
        if (content) {
            const urlParts = content.split('/');
            const lastPart = urlParts[urlParts.length - 1];
            // Remover el timestamp del nombre si existe
            return lastPart.replace(/^\d+_/, '');
        }
        return 'archivo';
    };

    // Truncar texto largo
    const truncateText = (text, maxLength = 500) => {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    return (
        <div className={`chat-message-row ${isMe ? 'me' : 'other'}`}>
            {/* Avatar solo para mensajes de otros usuarios (izquierda) */}
            {!isMe && <Avatar username={username} />}
            
            <div className="message-content">
                {/* Nickname arriba de la burbuja (solo para otros) */}
                {!isMe && (
                    <div className="message-nickname">{displayName}</div>
                )}
                
                {/* Burbuja del mensaje */}
                <div className={`bubble ${isMe ? 'me-bubble' : 'other-bubble'}`}>
                    {contentType === 'text' ? (
                        <div className="bubble-text">{truncateText(content)}</div>
                    ) : isImage ? (
                        <div className="bubble-image">
                            <img 
                                src={content}
                                alt={getFilename()}
                                onClick={() => window.open(content, '_blank')}
                            />
                        </div>
                    ) : isFile ? (
                        <a 
                            href={content} 
                            download={getFilename()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bubble-file"
                        >
                            <span className="file-icon">📎</span>
                            <span className="file-name">{getFilename()}</span>
                            <span className="file-download">⬇️</span>
                        </a>
                    ) : (
                        <div className="bubble-file">
                            📎 {getFilename()}
                        </div>
                    )}
                </div>
                
                {/* Hora FUERA de la burbuja, abajo */}
                <span className="message-time">{formatTime(timestamp)}</span>
            </div>
        </div>
    );
};