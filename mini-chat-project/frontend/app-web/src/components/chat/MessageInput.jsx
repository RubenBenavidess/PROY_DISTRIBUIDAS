import React, { useState } from 'react';
import './MessageInput.css';

/**
 * @param {object} props
 * @param {function} props.onSendMessage - Función para mandar texto
 * @param {function} props.onSendFile - Función para mandar archivo
 * @param {boolean} props.showAttach - Si se muestra el clip 📎
 */
export const MessageInput = ({ onSendMessage, onSendFile, showAttach }) => {
    const [text, setText] = useState('');
    // Referencia para el input de archivo (que está oculto)
    const fileInputRef = React.useRef(null);

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
        // Resetea el input para poder subir el mismo archivo otra vez
        e.target.value = null; 
    };

    return (
        <form className="input-area" onSubmit={handleSubmit}>
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
            className="icon-button"
            onClick={() => fileInputRef.current?.click()} // Abre el input oculto
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
        
        {/* Botón de Enviar */}
        <button type="submit" className="send-button">
            ➤
        </button>
        </form>
    );
};