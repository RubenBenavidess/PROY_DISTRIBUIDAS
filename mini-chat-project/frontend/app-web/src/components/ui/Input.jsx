import React from 'react';
import './Input.css'; // Crearemos este CSS

/**
 * Input minimalista.
 * @param {object} props
 * @param {string} props.label - Texto del label
 * @param {string} props.type - Tipo de input (text, password)
 * @param {string} props.value - Valor controlado
 * @param {function} props.onChange - Función de cambio
 * @param {string} props.placeholder - Placeholder
 * @param {boolean} props.disabled - Si está deshabilitado
 */
export const Input = ({ label, type = 'text', value, onChange, placeholder, disabled }) => {
    return (
        <div className="input-wrapper">
        <label className="input-label">{label}</label>
        <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            className="minimal-input"
        />
        </div>
    );
};