import React from 'react';
import './RoomListItem.css'; // Ahorita creamos el CSS

// Iconos simples (luego puedes cambiarlos por 'react-icons' si quieres)
const RoomIcon = ({ type }) => (
    <span className="room-icon">
        {type === 'text/media' ? '📎' : '#'}
    </span>
);

export const RoomListItem = ({ room, isSelected, onClick }) => {
    return (
        // 'isSelected' cambia el estilo si está seleccionada
        <div
        className={`room-list-item ${isSelected ? 'selected' : ''}`}
        onClick={onClick}
        >
        <RoomIcon type={room.type} />
        <div className="room-details">
            <span className="room-title">{room.title}</span>
            <span className="room-subtitle">PIN: {room.pin}</span>
        </div>
        {/* Usamos el acento verde para el contador de usuarios */}
        <span className="room-user-count">
            {room.participants || 0}
        </span>
        </div>
    );
};