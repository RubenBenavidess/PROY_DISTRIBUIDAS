import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
// ¡Importamos las funciones de la API!
import { getAllRooms, createRoom } from '../services/api'; 
import { RoomListItem } from '../components/admin/RoomListItem'; // El componente bonito
import { Button } from '../components/ui/button'; // Tu botón verde
import { Input } from '../components/ui/Input';
import './AdminDashboardPage.css'; // El CSS (también lo vamos a cambiar)

const AdminDashboardPage = () => {
    const navigate = useNavigate();
    const logout = useAuthStore((state) => state.logout);

    // --- ESTADO DE LA PÁGINA ---
    const [rooms, setRooms] = useState([]); // Para la lista de salas de la API
    const [selectedRoom, setSelectedRoom] = useState(null); // Para la sala seleccionada
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // --- Estado para el modal de "Crear Sala" ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newRoomTitle, setNewRoomTitle] = useState('');
    const [newRoomType, setNewRoomType] = useState('text'); // 'text' o 'text/media'

    // --- Cargar las salas cuando el componente se monta (¡No más hardcodeo!) ---
    useEffect(() => {
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
        try {
        setIsLoading(true);
        const roomsData = await getAllRooms(); // Llama a tu API
        setRooms(roomsData);
        setError(null);
        } catch (err) {
        setError(err.message);
        } finally {
        setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout(); // Llama al backend para limpiar la cookie
            navigate('/admin/login');
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            // Aún así redirigir al login
            navigate('/admin/login');
        }
    };

    // --- Lógica del Modal de Crear Sala ---
    const handleCreateRoom = async (e) => {
        e.preventDefault();
        if (!newRoomTitle) return;

        try {
        // Llama a la API para crear la sala
        const newRoom = await createRoom({ title: newRoomTitle, type: newRoomType });
        // Añade la nueva sala a la lista (en vivo) y la selecciona
        setRooms([newRoom, ...rooms]);
        setSelectedRoom(newRoom);
        // Cierra el modal y resetea los campos
        setIsModalOpen(false);
        setNewRoomTitle('');
        setNewRoomType('text');
        } catch (err) {
        setError(err.message);
        }
    };

    return (
        <div className="dashboard-layout">
        
        {/* --- HEADER (Igual que antes) --- */}
        <header className="dashboard-header">
            <h1>Gestión de Salas</h1>
            <button onClick={handleLogout} className="logout-button">
            Cerrar Sesión
            </button>
        </header>

        {/* --- LAYOUT DE 2 COLUMNAS --- */}
        <div className="dashboard-columns">
            
            {/* Columna 1: Lista de Salas (Ahora se ve de ley) */}
            <aside className="column column-list">
            <div className="list-header">
                <h2>Salas Activas ({rooms.length})</h2>
                <button onClick={() => setIsModalOpen(true)} className="create-room-button-small">
                + Crear
                </button>
            </div>
            <div className="room-list-container">
                {isLoading && <p>Cargando salas...</p>}
                {error && <p className="error-text">{error}</p>}
                {!isLoading && rooms.length > 0 && rooms.map((room) => (
                <RoomListItem
                    key={room.roomId} // El backend devuelve 'roomId', no 'id'
                    room={room}
                    isSelected={selectedRoom?.roomId === room.roomId}
                    onClick={() => setSelectedRoom(room)}
                />
                ))}
                {!isLoading && rooms.length === 0 && (
                <p className="empty-message">No hay salas creadas aún.</p>
                )}
            </div>
            </aside>

            {/* Columna 2: Estadísticas (Reemplaza al chat feo) */}
            <main className="column column-stats">
            {selectedRoom ? (
                // --- VISTA SI HAY SALA SELECCIONADA ---
                <div>
                <h2 className="stats-title">{selectedRoom.title}</h2>
                <div className="stats-grid">
                    <div className="stat-card">
                    <span>PIN de Acceso</span>
                    <strong>{selectedRoom.pin || 'N/A'}</strong>
                    </div>
                    <div className="stat-card">
                    <span>Tipo de Sala</span>
                    <strong>{selectedRoom.type}</strong>
                    </div>
                    <div className="stat-card">
                    <span>Usuarios Conectados</span>
                    <strong>{selectedRoom.participants || 0}</strong>
                    </div>
                    <div className="stat-card">
                    <span>ID de Sala</span>
                    <strong className="small-text">{selectedRoom.roomId}</strong>
                    </div>
                </div>
                {/* Aquí puedes agregar más botones, como "Borrar Sala" */}
                </div>
            ) : (
                // --- VISTA SI NO HAY NADA SELECCIONADO ---
                <div className="stats-placeholder">
                <h3>Selecciona una sala</h3>
                <p>Haz clic en una sala de la lista de la izquierda para ver sus estadísticas.</p>
                </div>
            )}
            </main>
        </div>

        {/* --- MODAL DE CREAR SALA (Oculto por defecto) --- */}
        {isModalOpen && (
            <div className="modal-overlay">
            <div className="modal-content">
                <h2>Crear Nueva Sala</h2>
                <form onSubmit={handleCreateRoom}>
                <Input
                    label="Nombre de la Sala"
                    type="text"
                    value={newRoomTitle}
                    onChange={(e) => setNewRoomTitle(e.target.value)}
                    placeholder="Ej: Sala de Reunión"
                />
                <div className="room-type-selector">
                    <label>Tipo de Sala:</label>
                    <select value={newRoomType} onChange={(e) => setNewRoomType(e.target.value)}>
                    <option value="text">Solo Texto</option>
                    <option value="text/media">Texto y Multimedia</option>
                    </select>
                </div>
                
                <div className="modal-actions">
                    <Button type="button" onClick={() => setIsModalOpen(false)} className="secondary-button">
                    Cancelar
                    </Button>
                    <Button type="submit">
                    Crear Sala
                    </Button>
                </div>
                </form>
            </div>
            </div>
        )}
        </div>
    );
};

export default AdminDashboardPage;