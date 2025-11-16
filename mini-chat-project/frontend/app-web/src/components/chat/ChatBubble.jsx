import React from 'react';
import './ChatBubble.css'; // Vamos a cambiar este CSS

/**
 * Genera un "avatar" placeholder con las iniciales del usuario.
 */
const Avatar = ({ username }) => {
  const initial = username ? username[0].toUpperCase() : '?';
  // (Aquí podrías poner un <img> si tuvieras fotos de perfil)
  return (
    <div className="chat-avatar">
      <span>{initial}</span>
    </div>
  );
};

export const ChatBubble = ({ message, isMe }) => {
  const { username, content, timestamp, contentType, filename } = message;

  const formatTime = (ts) => {
    return new Date(ts).toLocaleTimeString('es-EC', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // La lógica 'isMe' ahora solo cambia el orden (avatar a la izq o der)
  return (
    <div className={`chat-message-row ${isMe ? 'me' : 'other'}`}>
      {!isMe && <Avatar username={username} />}
      
      <div className="message-content">
        <div className="message-header">
          {/* Añadimos el icono 👤 y el contenedor */}
          {!isMe && (
            <span className="user-indicator">
              <span className="user-icon">👤</span>
              <span className="username">{username}</span>
            </span>
          )}
          <span className="timestamp">{formatTime(timestamp)}</span>
        </div>
        
        <div className={`bubble ${isMe ? 'me-bubble' : 'other-bubble'}`}>
          {contentType === 'text' ? (
            <div className="bubble-text">{content}</div>
          ) : (
            <div className="bubble-text file">
              📎 {filename || 'Archivo'}
            </div>
          )}
        </div>
      </div>
      
      {/* (No ponemos avatar para "mí" para que se vea más limpio) */}
    </div>
  );
};