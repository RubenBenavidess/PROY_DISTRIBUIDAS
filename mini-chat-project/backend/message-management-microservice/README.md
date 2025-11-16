# Message Management Microservice

Microservicio de gestión de mensajes en tiempo real con WebSockets, encriptación y seguridad avanzada.

### Comunicación en Tiempo Real
- WebSocket con Socket.IO
- Mensajes instantáneos (latencia < 1s)
- Indicadores de escritura
- Lista de participantes en tiempo real
- Notificaciones de conexión/desconexión
- Heartbeat para mantener sesiones activas

### Seguridad
- **Encriptación AES-256-GCM** para mensajes en reposo
- **Hashing PBKDF2** para PINs de sala
- **Firmas HMAC-SHA256** para integridad de mensajes
- **Usernames hasheados** para privacidad
- **Validación anti-XSS** en contenido
- **Rate limiting** contra DDoS
- **Session tokens** únicos y seguros
- **Detección de esteganografía** (delegada a microservicio)

### Gestión de Salas
- Creación con ID único encriptado
- PIN de 4 dígitos con hash seguro
- Tipos: `text` (solo texto) y `text/media` (multimedia)
- Límite configurable de participantes
- Límite configurable de tamaño de archivos
- Control de capacidad en tiempo real

### Procesamiento de Archivos
- **Delegación a microservicio de verificación**
- Detección automática de esteganografía
- Rechazo de archivos sospechosos
- Almacenamiento seguro de metadatos
- Verificación de integridad con hashes

## Instalación

```bash
npm install
cp .env.example .env
```

## Ejecución

```bash
# Requiere que file-verification-microservice esté corriendo en puerto 3003
npm run dev
```

## WebSocket Events

### Cliente → Servidor

**Unirse a Sala:**
```javascript
socket.emit('join-room', {
  roomId: 'abc123...',
  pin: '1234',
  nickname: 'Juan'
}, (response) => {
  if (response.success) {
    console.log('Joined!', response.roomInfo);
  }
});
```

**Enviar Mensaje:**
```javascript
socket.emit('send-message', {
  content: 'Hola!'
}, (response) => {
  console.log('Sent:', response.messageId);
});
```

**Enviar Archivo:**
```javascript
socket.emit('send-file', {
  fileBuffer: Array.from(new Uint8Array(buffer)),
  mimeType: 'image/png',
  filename: 'image.png'
}, (response) => {
  if (response.success) {
    console.log('File verified and sent');
  }
});
```

### Servidor → Cliente

```javascript
socket.on('new-message', (data) => {
  // { id, username, content, timestamp, signature }
});

socket.on('new-file', (data) => {
  // { username, filename, hash, verified, timestamp }
});

socket.on('user-joined', (data) => {
  // { nickname, timestamp, participants }
});
```