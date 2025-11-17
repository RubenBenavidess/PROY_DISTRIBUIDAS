import React, { useState, useRef } from 'react';
import './MessageInput.css'; // Vamos a cambiar este CSS

// Constantes de validación
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB en bytes
const BLOCKED_EXTENSIONS = ['.zip', '.rar', '.7z', '.tar', '.gz'];

export const MessageInput = ({ onSendMessage, onSendFile, showAttach }) => {
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text.trim());
      setText('');
    }
  };

  /**
   * Valida el archivo antes de enviarlo
   * @param {File} file - Archivo a validar
   * @returns {Object} - { valid: boolean, error?: string }
   */
  const validateFile = (file) => {
    // Validar tamaño (10 MB máximo)
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `El archivo es muy grande. Tamaño máximo: 10 MB (${(file.size / (1024 * 1024)).toFixed(2)} MB)`
      };
    }

    // Validar extensión
    const fileName = file.name.toLowerCase();
    const hasBlockedExtension = BLOCKED_EXTENSIONS.some(ext => fileName.endsWith(ext));
    
    if (hasBlockedExtension) {
      return {
        valid: false,
        error: 'Archivos comprimidos (.zip, .rar, .7z, etc.) no están permitidos por seguridad'
      };
    }

    return { valid: true };
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    
    if (file) {
      // Limpiar error previo
      setError(null);

      // Validar archivo
      const validation = validateFile(file);
      
      if (!validation.valid) {
        // Mostrar error
        setError(validation.error);
        
        // Limpiar después de 5 segundos
        setTimeout(() => setError(null), 5000);
        
        // Limpiar input
        e.target.value = null;
        return;
      }

      // Si es válido, enviarlo
      onSendFile(file);
    }
    
    e.target.value = null;
  };

  // La lógica no cambia, solo el HTML/CSS
  return (
    <div className="input-area-container">
      {/* Mensaje de error */}
      {error && (
        <div className="file-error-message">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
        </div>
      )}
      
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
            title="Adjuntar archivo (máx. 10 MB)"
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