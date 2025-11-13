const express = require('express');
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

// Asegura que el directorio de subidas exista
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
app.use(express.json());
app.use(cors());


// // Conexión a la base de datos
// require('./Config/db');
// const Room = require('./Models/room');
// const Message = require('./Models/message');

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET','POST'] }
});

const PORT = process.env.PORT || 5000;

// Esta variable guarda los usuarios conectados por sala con: { roomId: { socketId: nickname } }
const roomsUsers = {};

// Multer que guarda los archivos en uploads/, preservando el nombre original
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// Cuando el admin entra, devuelve un JWT
app.post('/admin/login', async (req, res) => {
    const { username, password } = req.body || {};
    const ADMIN_USER = process.env.ADMIN_USER || 'admin';
    const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';
    if (!username || !password) return res.status(400).json({ error: 'Faltan credenciales' });
    if (username !== ADMIN_USER || password !== ADMIN_PASS) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const token = jwt.sign({ username }, process.env.ADMIN_JWT_SECRET || 'secret123', { expiresIn: '8h' });
    res.json({ token });
});

// Creación de salas para el admin
app.post('/rooms', async (req, res) => {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Falta token' });
    const token = auth.split(' ')[1];
    try {
        jwt.verify(token, process.env.ADMIN_JWT_SECRET || 'secret123'); 
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido' });
    }

    const { type = 'text', maxFileSize } = req.body || {};
    if (!['text','multimedia'].includes(type)) return res.status(400).json({ error: 'Tipo de sala inválido' });
    const roomId = uuidv4().split('-')[0];
    const pinPlain = String(Math.floor(1000 + Math.random() * 9000)); // 4 digitos
    const pinHash = await bcrypt.hash(pinPlain, 10);
    const room = new Room({ roomId, type, pinHash, maxFileSize: maxFileSize || undefined });
    await room.save();
    // Devuelve pinPlain una vez al admin
    res.json({ roomId, pin: pinPlain });
});

// Para subir archivos a la sala multimedia 
app.post('/rooms/:roomId/upload', upload.single('file'), async (req, res) => {
    const { roomId } = req.params;
    const { pin, nickname } = req.body || {};
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Archivo no subido' });
    const room = await Room.findOne({ roomId });
    if (!room) return res.status(404).json({ error: 'Sala no encontrada' });
    if (room.type !== 'multimedia') return res.status(400).json({ error: 'Sala no multimedia' });
    const ok = await bcrypt.compare(pin || '', room.pinHash);
    if (!ok) return res.status(401).json({ error: 'PIN inválido' });
    if (room.maxFileSize && file.size > room.maxFileSize) {
        // elimina el archivo
        fs.unlinkSync(file.path);
        return res.status(400).json({ error: 'Archivo muy grande' });
    }
    const fileUrl = `/uploads/${path.basename(file.path)}`;
    const message = new Message({ roomId, username: nickname || 'Anonimo', file: { filename: file.filename, originalname: file.originalname, mimetype: file.mimetype, size: file.size, url: fileUrl } });
    await message.save();
    // Anuncia a la sala la subida
    io.to(roomId).emit('response', { roomId, username: message.username, file: message.file, createdAt: message.createdAt });
    res.json({ ok: true, file: message.file });
});

// Archivo estático de subidas
app.use('/uploads', express.static(UPLOAD_DIR));

// Conexiones de Socket.IO
io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado: ' + socket.id);

    socket.emit('status', { msg: 'Conexión exitosa. ¡BIENVENIDO!' });

    // Unirse a sala con pin + apodo
    socket.on('join_room', async (data) => {
        try {
            const { roomId, pin, nickname } = data || {};
            if (!roomId || !pin || !nickname) return socket.emit('error', { error: 'Faltan parámetros para unirse' });
            const room = await Room.findOne({ roomId });
            if (!room) return socket.emit('error', { error: 'Sala no encontrada' });
            const ok = await bcrypt.compare(String(pin), room.pinHash);
            if (!ok) return socket.emit('error', { error: 'PIN inválido' });

            // Unico ID en la sala
            roomsUsers[roomId] = roomsUsers[roomId] || {};
            const names = Object.values(roomsUsers[roomId]);
            if (names.includes(nickname)) {
                return socket.emit('error', { error: 'Apodo en uso' });
            }

            socket.join(roomId);
            roomsUsers[roomId][socket.id] = nickname;

            // Lista de usuarios actual
            io.to(roomId).emit('users', Object.values(roomsUsers[roomId]));

            // enviar mensajes recientes (últimos 50)
            const recent = await Message.find({ roomId }).sort({ createdAt: -1 }).limit(50).lean();
            socket.emit('history', recent.reverse());
        } catch (err) {
            console.error('Error al entrar al sala', err);
            socket.emit('error', { error: 'Error en el servidor entrando en la sala' });
        }
    });

    socket.on('message', async (data) => {
        try {
            // datos: { roomId, msg, username }
            if (!data || !data.roomId || !data.msg) return socket.emit('error', { error: 'Payload de mensaje inválido' });
            const roomId = data.roomId;
            const username = data.username || roomsUsers[roomId] && roomsUsers[roomId][socket.id] || 'Anonimo';
            // sanitización básica: limitar longitud
            const text = String(data.msg).slice(0, 2000);
            const message = new Message({ roomId, username, msg: text });
            await message.save();
            io.to(roomId).emit('response', { roomId, username, msg: text, createdAt: message.createdAt });
        } catch (err) {
            console.error('message handler error', err);
            socket.emit('error', { error: 'Server error' });
        }
    });

    socket.on('disconnect', () => {
        // eliminar de roomsUsers
        Object.keys(roomsUsers).forEach((roomId) => {
            if (roomsUsers[roomId] && roomsUsers[roomId][socket.id]) {
                delete roomsUsers[roomId][socket.id];
                io.to(roomId).emit('users', Object.values(roomsUsers[roomId] || {}));
            }
        });
        console.log('Cliente desconectado: ' + socket.id);
    });
});

server.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));

module.exports = app;
