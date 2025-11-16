import React, { useState, useRef } from 'react';
import './MessageInput.css'; // Vamos a cambiar este CSS

export const MessageInput = ({ onSendMessage, onSendFile, showAttach }) => {
  const [text, setText] = useState('');
  const fileInputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text.trim());
      setText('');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onSendFile(file);
    }
    e.target.value = null;
  };

  // La lógica no cambia, solo el HTML/CSS
  return (
    <div className="input-area-container">
      <form className="input-area-wrapper" onSubmit={handleSubmit}>
        {/* Input de archivo oculto */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        
        {/* Botón de Adjuntar (Clip 📎) */}
        {showAttach && (
          <button 
            type="button" 
            className="input-icon-button"
            onClick={() => fileInputRef.current?.click()}
          >
            📎
          </button>
        )}

        {/* Input de Texto */}
        <input
          type="text"
          className="text-input"
          placeholder="Escribe un mensaje..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        
        {/* Botón de Enviar (Ahora es un ícono de la foto) */}
        <button type="submit" className="input-icon-button send">
          {/* (Ícono SVG simple de "Enviar") */}
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
          </svg>
        </button>
      </form>
    </div>
  );
};