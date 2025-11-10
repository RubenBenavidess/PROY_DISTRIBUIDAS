const express = require('express');
const socket = require('socket.io');

const app = express(); 

const server = app.listen(5000, () => {
    console.log('Servidor corriendo en el puerto 5000');
});

const io = socket(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado: ' + socket.id);
    socket.emit('status', {msg: 'Conexión exitosa. ¡BIENVENIDO!'});
    socket.broadcast.emit('status', {msg: `Usuario ${socket.id} se ha conectado.`});

    socket.on('message', (data) => {
        console.log(`Mensaje recibido: ${data.msg} de ${data.username || 'Anonimo'}`);
        const message_data = {
            msg: data.msg,
            username: data.username || 'Anonimo',
            time: new Date().toISOString()
        };
        io.emit('response', message_data);
    });

    socket.on('disconnect', () => {
        console.log('Cliente desconectado: ' + socket.id);
        socket.broadcast.emit('status', {msg: `Usuario ${socket.id} se ha desconectado.`});
    });
});

module.exports = app;
