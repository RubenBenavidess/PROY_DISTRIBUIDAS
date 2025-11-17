import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; // 1. Importa nuestro Router
import './index.css';     // 2. Importa el CSS global (lo creamos abajo)

ReactDOM.createRoot(document.getElementById('root')).render(
    // <React.StrictMode>
        <App />
    /* </React.StrictMode>, */
);