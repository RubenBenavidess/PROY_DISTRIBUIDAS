import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();

  const goToAdminLogin = () => {
    navigate('/admin/login');
  };

  const goToJoinRoom = () => {
    navigate('/join');
  };

  return (
    <div className="landing-container">
      <div className="landing-wrapper">
        <h1 className="landing-title">Bienvenido al Chat</h1>
        <p className="landing-subtitle">¿Cómo quieres ingresar?</p>
        <div className="button-group">
          <button 
            className="choice-button admin-button" 
            onClick={goToAdminLogin}
          >
            Soy Administrador
          </button>
          <button 
            className="choice-button user-button" 
            onClick={goToJoinRoom}
          >
            Soy Usuario de Chat
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;