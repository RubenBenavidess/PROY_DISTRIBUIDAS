import React from 'react';
import './button.css'; // Crearemos este CSS (nombre en minúsculas)

/**
 * Botón de Acento reutilizable.
 * @param {object} props
 * @param {React.ReactNode} props.children - El texto o ícono del botón
 * @param {function} props.onClick - Función del clic
 * @param {string} [props.type="button"] - Tipo de botón (button, submit)
 * @param {boolean} [props.disabled=false] - Si está deshabilitado
 */
export const Button = ({ children, onClick, type = 'button', disabled = false }) => {
    return (
        <button
        className="accent-button"
        onClick={onClick}
        type={type}
        disabled={disabled}
        >
        {children}
        </button>
    );
};