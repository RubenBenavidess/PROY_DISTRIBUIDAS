import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore'; // El cerebro
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/button';   
import './AdminLoginPage.css'; // CSS para centrar todo

const AdminLoginPage = () => {
    // Estado local para los campos del formulario
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Traemos la acción de "login" de nuestro store (Zustand)
    const login = useAuthStore((state) => state.login);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault(); // Evita que la página se recargue
        setError(null);
        setIsLoading(true);

        try {
        // 1. Llama a la acción del store
        //    (authStore -> api.js -> gateway -> authService.js)
        await login({ username, password });

        // 2. Si tiene éxito, navegamos al Dashboard
        setIsLoading(false);
        navigate('/admin/dashboard');

        } catch (err) {
        // 3. Si falla (ej: "Invalid Credentials B"), mostramos el error
        setIsLoading(false);
        const errorMessage = err.message.includes('40') ? 'Usuario o clave incorrecta' : 'Error del servidor. Intenta de nuevo.';
        setError(errorMessage);
        }
    };

    return (
        <div className="login-page-container">
        <div className="login-form-wrapper">
            <h1 className="login-title">Panel de Administrador</h1>
            <p className="login-subtitle">Ingresa tus credenciales para gestionar las salas.</p>

            <form onSubmit={handleSubmit}>
            <Input
                label="Username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="tu-usuario"
            />

            <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
            />

            {error && (
                <div className="error-message">
                {error}
                </div>
            )}

            <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Ingresando...' : 'Ingresar'}
            </Button>
            </form>
        </div>
        </div>
    );
};

export default AdminLoginPage;