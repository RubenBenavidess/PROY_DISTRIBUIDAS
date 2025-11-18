# Mini Chat Project

Sistema de chat distribuido en tiempo real con arquitectura de microservicios, autenticación basada en JWT, gestión de salas con PIN, y soporte para mensajería de texto y multimedia.

## Tabla de Contenidos

- [Arquitectura del Sistema](#arquitectura-del-sistema)
- [Características Principales](#características-principales)
- [Tecnologías Utilizadas](#tecnologías-utilizadas)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Requisitos Previos](#requisitos-previos)
- [Instalación y Configuración](#instalación-y-configuración)
- [Ejecución del Proyecto](#ejecución-del-proyecto)
- [Pruebas](#pruebas)
- [Documentación API](#documentación-api)
- [Seguridad](#seguridad)
- [Contribución](#contribución)

## Arquitectura del Sistema

El proyecto implementa una arquitectura de microservicios con los siguientes componentes:

```
┌─────────────────┐
│   Frontend      │
│   (React)       │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  API Gateway    │
│  (Express)      │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    v         v
┌─────────┐ ┌──────────────────┐
│  Auth   │ │   Message Mgmt   │
│ Service │ │    Service       │
└─────────┘ └──────────────────┘
    │              │
    v              v
┌─────────┐ ┌──────────────────┐
│MongoDB  │ │MongoDB + MinIO   │
└─────────┘ └──────────────────┘
```

### Componentes:

1. **Frontend (React + Vite)**
   - Interfaz de usuario moderna y responsive
   - WebSocket para comunicación en tiempo real
   - Gestión de estado con Zustand
   - Validación de formularios con Zod

2. **API Gateway (Express)**
   - Punto de entrada único para todas las peticiones
   - Enrutamiento a microservicios
   - Proxy de WebSockets
   - Manejo centralizado de errores

3. **Authentication Microservice**
   - Autenticación JWT con algoritmo ES256
   - Gestión de sesiones con cookies HttpOnly
   - Verificación de credenciales de administrador
   - Encriptación de contraseñas con bcrypt

4. **Message Management Microservice**
   - Gestión de salas de chat
   - Manejo de mensajes en tiempo real via WebSocket
   - Almacenamiento de archivos en MinIO
   - Historial de mensajes persistente

## Características Principales

### Funcionalidades Generales

- **Gestión de Salas**
  - Creación de salas con título, tipo (texto/texto+media) y PIN de 4 dígitos
  - Límite configurable de participantes (2-50)
  - Eliminación de salas vacías o por administrador

- **Sistema de Mensajería**
  - Mensajes de texto en tiempo real
  - Soporte para archivos multimedia (imágenes, documentos)
  - Validación de archivos: tamaño máximo 10 MB
  - Bloqueo de archivos comprimidos (.zip, .rar, .7z, etc.)
  - Historial de mensajes recientes (últimos 50)

- **Seguridad**
  - Hash SHA-256 de nicknames para privacidad
  - Autenticación basada en JWT con claves ECDSA
  - Cookies HttpOnly para prevenir XSS
  - Validación de PIN para acceso a salas
  - Sanitización de inputs
  - Encriptación E2E con algoritmo: AES-GCM-256
  - Derivación de la clave con la sala: SHA-256(`roomId:pin`)
    - **Compartida**: Todos los usuarios de la sala calculan la misma clave
    - **Nunca enviada**: Se calcula localmente en cada cliente

- **🛡️ Análisis de Archivos con Web Workers (NUEVO)**
  - **Detección de esteganografía LSB** en imágenes
  - **Análisis de entropía de Shannon** para detectar patrones anómalos
  - **Verificación de MIME types** (magic bytes) contra archivos disfrazados
  - **Análisis de metadatos** (EXIF, PNG chunks) para detectar ocultamiento de datos
  - **Procesamiento con hilos** (Web Workers) sin bloquear UI
  - **Compatible con E2EE**: Análisis ANTES de encriptar
  - **Niveles de riesgo**: CRITICAL, HIGH, MEDIUM, LOW
  - **Bloqueo automático** de amenazas críticas/altas
  - **Reportes detallados** de análisis con tiempos de procesamiento
  - Ver documentación completa: [`ANALISIS_ARCHIVOS_WEB_WORKERS.md`](./ANALISIS_ARCHIVOS_WEB_WORKERS.md)


### Panel de Administración

- Autenticación segura para administradores
- Visualización de todas las salas activas
- Creación y eliminación de salas
- Monitoreo de participantes por sala

### Interfaz de Usuario

- Diseño moderno inspirado en Discord
- Modo responsive para móviles y desktop
- Indicadores de archivo en tiempo real
- Preview de imágenes en el chat
- Gestión de archivos compartidos

## Tecnologías Utilizadas

### Backend

- **Node.js v20+** - Runtime de JavaScript
- **Express.js** - Framework web
- **Socket.IO** - Comunicación WebSocket bidireccional
- **MongoDB** - Base de datos NoSQL
- **Mongoose** - ODM para MongoDB
- **MinIO** - Almacenamiento de objetos S3-compatible
- **JWT (jsonwebtoken)** - Autenticación
- **bcrypt** - Hashing de contraseñas
- **Zod** - Validación de esquemas

### Frontend

- **React 18** - Biblioteca de interfaz de usuario
- **Vite** - Build tool y dev server
- **React Router DOM** - Enrutamiento
- **Zustand** - Gestión de estado
- **Socket.IO Client** - Cliente WebSocket
- **Vitest** - Framework de pruebas
- **Testing Library** - Utilidades de testing

### DevOps

- **Docker** - Contenedorización
- **Docker Compose** - Orquestación de contenedores
- **Jest** - Testing para backend
- **ESLint** - Linting de código

## Estructura del Proyecto

```
mini-chat-project/
├── backend/
│   ├── api-gateway/               # Gateway principal
│   │   ├── index.js
│   │   ├── config/
│   │   ├── __tests__/
│   │   └── package.json
│   ├── authentication-microservice/
│   │   └── src/
│   │       ├── server.js
│   │       ├── controllers/
│   │       ├── models/
│   │       ├── routes/
│   │       ├── security/
│   │       ├── services/
│   │       ├── middleware/
│   │       ├── keys/              # Claves ECDSA
│   │       ├── __tests__/
│   │       └── package.json
│   ├── message-management-microservice/
│   │   ├── Dockerfile
│   │   ├── src/
│   │   │   ├── server.js
│   │   │   ├── controllers/
│   │   │   ├── models/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   ├── websocket/
│   │   │   │   ├── socketHandler.js
│   │   │   │   └── handlers/
│   │   │   └── lib/               # MinIO operations
│   │   └── package.json
│   ├── compose.yaml               # Docker Compose config
│   └── setup-minio.sh             # Script de configuración MinIO
├── frontend/
│   └── app-web/
│       ├── src/
│       │   ├── main.jsx
│       │   ├── App.jsx
│       │   ├── components/
│       │   │   ├── admin/
│       │   │   ├── auth/
│       │   │   ├── chat/
│       │   │   └── ui/
│       │   ├── pages/
│       │   │   ├── LandingPage.jsx
│       │   │   ├── AdminLoginPage.jsx
│       │   │   ├── AdminDashboardPage.jsx
│       │   │   ├── JoinRoomPage.jsx
│       │   │   └── ChatRoomPage.jsx
│       │   ├── services/
│       │   │   ├── api.js
│       │   │   └── socketService.js
│       │   ├── store/
│       │   │   ├── authStore.js
│       │   │   └── roomStore.js
│       │   ├── utils/
│       │   │   └── crypto.js
│       │   └── tests/
│       ├── coverage/               # Reportes de cobertura
│       ├── package.json
│       ├── vite.config.js
│       └── vitest.config.js
└── README.md
```

## Requisitos Previos

- **Node.js**: v20.x o superior
- **npm**: v10.x o superior
- **Docker**: v24.x o superior
- **Docker Compose**: v2.x o superior
- **MongoDB**: v7.x (via Docker)
- **MinIO**: Latest (via Docker)

## Instalación y Configuración

### 1. Clonar el Repositorio

```bash
git clone https://github.com/RubenBenavidess/PROY_DISTRIBUIDAS.git
cd PROY_DISTRIBUIDAS/mini-chat-project
```

### 2. Configurar Variables de Entorno

#### Backend - Authentication Service

Crear archivo `.env` en `backend/authentication-microservice/src/`:

```env
PORT=3001
MONGO_URI=mongodb://localhost:27017/mini-chat-auth
JWT_PRIVATE_KEY_PATH=./keys/ec_private.pem
JWT_PUBLIC_KEY_PATH=./keys/ec_public.pem
JWT_ALGORITHM=ES256
JWT_EXPIRES_IN=24h
COOKIE_SECRET=your-super-secret-cookie-key-change-this
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

#### Backend - Message Management Service

Crear archivo `.env` en `backend/message-management-microservice/src/`:

```env
PORT=3002
MONGO_URI=mongodb://localhost:27017/mini-chat-messages
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=chat-files
MAX_FILE_SIZE=10485760
SESSION_TIMEOUT=3600000
WS_PING_TIMEOUT=30000
WS_PING_INTERVAL=25000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

#### Backend - API Gateway

Crear archivo `.env` en `backend/api-gateway/`:

```env
PORT=8080
AUTH_SERVICE_URL=http://localhost:3001
MESSAGE_SERVICE_URL=http://localhost:3002
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

#### Frontend

Crear archivo `.env` en `frontend/app-web/`:

```env
VITE_API_URL=http://localhost:8080
```

### 3. Generar Claves ECDSA para JWT

```bash
cd backend/authentication-microservice/src/keys

# Generar clave privada
openssl ecparam -genkey -name prime256v1 -noout -out ec_private.pem

# Extraer clave pública
openssl ec -in ec_private.pem -pubout -out ec_public.pem
```

### 4. Instalar Dependencias

#### Backend

```bash
# API Gateway
cd backend/api-gateway
npm install

# Authentication Service
cd ../authentication-microservice/src
npm install

# Message Management Service
cd ../../message-management-microservice
npm install
```

#### Frontend

```bash
cd frontend/app-web
npm install
```

## Ejecución del Proyecto

### Opción 1: Con Docker Compose (Recomendado)

```bash
cd backend
docker-compose up -d
```

Esto iniciará:
- MongoDB (puerto 27017)
- MinIO (puerto 9000, consola: 9001)
- Message Management Service (puerto 3002)

Para detener:

```bash
docker-compose down
```

### Opción 2: Ejecución Manual

#### 1. Iniciar MongoDB

```bash
docker run -d -p 27017:27017 --name mongodb mongo:7
```

#### 2. Iniciar MinIO

```bash
docker run -d \
  -p 9000:9000 \
  -p 9001:9001 \
  --name minio \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"
```

#### 3. Configurar MinIO

```bash
cd backend
chmod +x setup-minio.sh
./setup-minio.sh
```

#### 4. Iniciar Servicios Backend

```bash
# Terminal 1 - Authentication Service
cd backend/authentication-microservice/src
npm run dev

# Terminal 2 - Message Management Service
cd backend/message-management-microservice
npm run dev

# Terminal 3 - API Gateway
cd backend/api-gateway
npm run dev
```

#### 5. Iniciar Frontend

```bash
cd frontend/app-web
npm run dev
```

### Acceso a las Aplicaciones

- **Frontend**: http://localhost:5173
- **API Gateway**: http://localhost:8080
- **Auth Service**: http://localhost:3001
- **Message Service**: http://localhost:3002
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)
- **MongoDB**: mongodb://localhost:27017

## Pruebas

### Frontend

```bash
cd frontend/app-web

# Ejecutar todas las pruebas
npm test

# Ejecutar con cobertura
npm run test:coverage

# Ejecutar en modo watch
npm run test:watch
```

Cobertura actual: 82.27% (supera el mínimo del 70%)

### Backend

#### Authentication Service

```bash
cd backend/authentication-microservice/src

# Ejecutar pruebas
npm test

# Con cobertura
npm run test:coverage
```

#### API Gateway

```bash
cd backend/api-gateway

# Ejecutar pruebas
npm test

# Con cobertura
npm run test:coverage
```

## Documentación API

### Authentication Endpoints

#### POST /api/auth/login
Autenticación de administrador

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful"
}
```

#### POST /api/auth/logout
Cierre de sesión

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

#### GET /api/auth/verify-session
Verificar sesión activa

**Response:**
```json
{
  "success": true
}
```

### Room Management Endpoints

#### POST /api/rooms
Crear nueva sala (requiere autenticación)

**Request:**
```json
{
  "title": "Sala General",
  "type": "text/media",
  "pin": "1234",
  "maxParticipants": 10
}
```

**Response:**
```json
{
  "success": true,
  "room": {
    "roomId": "abc123",
    "title": "Sala General",
    "type": "text/media",
    "pin": "1234",
    "maxParticipants": 10,
    "createdAt": "2025-11-17T00:00:00.000Z"
  }
}
```

#### GET /api/rooms
Obtener todas las salas (requiere autenticación)

**Response:**
```json
{
  "success": true,
  "count": 2,
  "rooms": [
    {
      "roomId": "abc123",
      "title": "Sala General",
      "type": "text/media",
      "participants": 5,
      "maxParticipants": 10
    }
  ]
}
```

#### GET /api/rooms/:roomId
Obtener información de una sala específica

**Response:**
```json
{
  "success": true,
  "room": {
    "roomId": "abc123",
    "title": "Sala General",
    "type": "text/media",
    "participants": 5,
    "maxParticipants": 10
  }
}
```

#### DELETE /api/rooms/:roomId
Eliminar sala (requiere autenticación)

**Response:**
```json
{
  "success": true,
  "message": "Room deleted successfully"
}
```

### WebSocket Events

#### Client to Server

**join-room**
```javascript
socket.emit('join-room', {
  roomId: 'abc123',
  pin: '1234',
  nickname: 'Usuario1'
}, (response) => {
  console.log(response);
  // { success: true, sessionId: '...', roomInfo: {...}, messages: [...] }
});
```

**send-message**
```javascript
socket.emit('send-message', {
  content: 'Hola a todos'
}, (response) => {
  console.log(response);
  // { success: true, messageId: '...', timestamp: '...' }
});
```

**send-file**
```javascript
socket.emit('send-file', {
  fileBuffer: arrayBuffer,
  mimeType: 'image/png',
  filename: 'imagen.png'
}, (response) => {
  console.log(response);
  // { success: true, hash: '...', timestamp: '...' }
});
```

**leave-room**
```javascript
socket.emit('leave-room', {}, (response) => {
  console.log(response);
  // { success: true }
});
```

**get-participants**
```javascript
socket.emit('get-participants', {}, (response) => {
  console.log(response);
  // { success: true, participants: [...], count: 5 }
});
```

#### Server to Client

**new-message**
```javascript
socket.on('new-message', (message) => {
  console.log(message);
  // { id: '...', username: '...', content: '...', timestamp: '...', contentType: 'text' }
});
```

**new-file**
```javascript
socket.on('new-file', (fileMessage) => {
  console.log(fileMessage);
  // { id: '...', username: '...', content: 'url', filename: '...', contentType: 'image/png' }
});
```

**user-joined**
```javascript
socket.on('user-joined', (data) => {
  console.log(data);
  // { username: '...', timestamp: '...', participants: 6 }
});
```

**user-left**
```javascript
socket.on('user-left', (data) => {
  console.log(data);
  // { username: '...', timestamp: '...', participants: 5 }
});
```

## Seguridad

### Implementaciones de Seguridad

1. **Autenticación JWT**
   - Algoritmo ES256 (ECDSA)
   - Tokens con expiración de 24 horas
   - Claves asimétricas para firma y verificación

2. **Protección de Sesiones**
   - Cookies HttpOnly para prevenir XSS
   - Cookies Secure en producción
   - SameSite para prevenir CSRF

3. **Privacidad de Usuarios**
   - Hash SHA-256 de nicknames
   - No se almacenan datos personales
   - Nicknames hasheados con salt por sala

4. **Validación de Archivos**
   - Límite de 10 MB por archivo
   - Bloqueo de archivos comprimidos
   - Validación de tipos MIME
   - Sanitización de nombres de archivo

5. **Protección contra Ataques**
   - CORS configurado
   - Validación de inputs con Zod
   - Sanitización de datos
   - Rate limiting (recomendado para producción)

### Credenciales por Defecto

**Administrador:**
- Usuario: `admin`
- Contraseña: `admin123`

**IMPORTANTE**: Cambiar estas credenciales en producción.

## Buenas Prácticas

### Desarrollo

1. Usar las variables de entorno apropiadas
2. No commitear archivos `.env`
3. Mantener las claves ECDSA fuera del repositorio
4. Ejecutar linters antes de commit
5. Escribir pruebas para nuevas funcionalidades

### Producción

1. Usar HTTPS en todos los servicios
2. Configurar `NODE_ENV=production`
3. Habilitar cookies Secure
4. Implementar rate limiting
5. Monitorear logs y métricas
6. Realizar backups regulares de MongoDB
7. Actualizar dependencias regularmente
8. Usar secretos fuertes y únicos

## Troubleshooting

### MongoDB no se conecta

```bash
# Verificar que MongoDB esté corriendo
docker ps | grep mongo

# Ver logs de MongoDB
docker logs mongodb
```

### MinIO no guarda archivos

```bash
# Verificar buckets
docker exec -it minio mc ls local

# Configurar bucket si no existe
./backend/setup-minio.sh
```

### WebSocket no conecta

1. Verificar que el Message Service esté corriendo
2. Comprobar la URL del socket en el frontend
3. Verificar configuración de CORS
4. Revisar logs del navegador y servidor

### Error de autenticación JWT

1. Verificar que las claves ECDSA existan
2. Comprobar permisos de lectura de archivos de claves
3. Verificar que el formato de las claves sea correcto

## Contribución

1. Fork del repositorio
2. Crear rama de feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit de cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## Licencia

Este proyecto es parte de un trabajo académico.

## Autores

- Equipo de Desarrollo - Universidad de las Fuerzas Armadas ESPE

## Contacto

Para preguntas o sugerencias, contactar a través del repositorio de GitHub.
```
