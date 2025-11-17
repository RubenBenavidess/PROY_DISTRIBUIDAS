# Frontend Web - Mini Chat Project

## 📋 Descripción

Aplicación web frontend para el sistema de chat distribuido. Construida con React 19, Vite y Socket.IO para comunicación en tiempo real.

## 🛠️ Tecnologías

- **React 19.2.0** - Framework UI
- **Vite 7.2.2** - Build tool y dev server
- **React Router v7.9.6** - Enrutamiento
- **Zustand 5.0.8** - Gestión de estado global
- **Socket.IO Client 4.8.1** - WebSocket para tiempo real
- **Axios 1.13.2** - Cliente HTTP
- **crypto-js 4.2.0** - Encriptación

## 🎨 Paleta de Colores

El proyecto usa un tema azul oscuro inspirado en Discord:

```css
/* Fondos */
--bg-primary: #070f27      /* Fondo Principal (oscuro azul) */
--bg-secondary: #0d1c49    /* Fondo Secundario (azul medio oscuro) */
--bg-tertiary: #1a2d5f     /* Fondo Terciario (azul medio) */

/* Acentos */
--accent-primary: #4A59E4  /* Acento Principal (azul brillante) */
--accent-light: #5d6eeb    /* Acento claro (para botones) */
--accent-green: #23A55A    /* Acento Verde (call button) */
--accent-red: #F23F43      /* Notificación (red dot) */

/* Texto */
--text-primary: #F5F5F5    /* Texto Principal */
--text-secondary: #9E9E9E  /* Texto Secundario */
```

Estas variables están definidas en `src/index.css` y se usan en todos los componentes.

## 📁 Estructura del Proyecto

```
src/
├── components/          # Componentes reutilizables
│   ├── ui/             # Componentes UI base (Button, Input)
│   ├── chat/           # Componentes de chat (ChatBubble, MessageInput)
│   └── admin/          # Componentes de administración (RoomListItem)
├── pages/              # Páginas/Rutas principales
│   ├── LandingPage.jsx        # Página inicial (elegir User/Admin)
│   ├── JoinRoomPage.jsx       # Unirse a sala (users)
│   ├── ChatRoomPage.jsx       # Sala de chat
│   ├── AdminLoginPage.jsx     # Login de administrador
│   └── AdminDashboardPage.jsx # Dashboard de administración
├── store/              # Estado global (Zustand)
│   └── useAuthStore.js # Store de autenticación
├── services/           # Servicios API
├── App.jsx             # Componente principal con rutas
├── index.css           # Estilos globales y variables CSS
└── main.jsx            # Punto de entrada

```

## 🚀 Instalación y Ejecución

### Requisitos Previos

- Node.js >= 18.x
- npm >= 9.x

### Instalación

```bash
# Instalar dependencias
npm install
```

### Variables de Entorno

Crea un archivo `.env` en la raíz del frontend:

```env
VITE_API_URL=http://localhost:8080
```

### Comandos Disponibles

```bash
# Desarrollo (corre en puerto 5173 por defecto)
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview

# Linting
npm run lint
```

## 🔌 Integración con Backend

El frontend se comunica con el backend a través del **API Gateway** (puerto 8080):

### HTTP API (REST)
- **Autenticación Admin**: `POST /auth/login`
- **Crear Sala**: `POST /api/rooms` (requiere JWT)
- **Obtener Salas**: `GET /api/rooms` (requiere JWT)

### WebSocket (Socket.IO)
- **Conexión**: Se conecta automáticamente al API Gateway
- **Eventos Emit**:
  - `join_room` - Unirse a una sala
  - `message` - Enviar mensaje
- **Eventos Listen**:
  - `message` - Recibir mensaje
  - `user_joined` - Usuario nuevo en sala
  - `user_left` - Usuario salió de sala

### Autenticación

El sistema usa JWT con algoritmo EC256:
- Token almacenado en `localStorage` vía Zustand
- Se envía en header `Authorization: Bearer <token>`
- Se valida en el API Gateway antes de rutear

## 🧭 Rutas de la Aplicación

| Ruta | Componente | Descripción | Autenticación |
|------|-----------|-------------|---------------|
| `/` | LandingPage | Página inicial (User/Admin) | No |
| `/join` | JoinRoomPage | Unirse a sala de chat | No |
| `/room/:roomId` | ChatRoomPage | Sala de chat activa | No |
| `/admin/login` | AdminLoginPage | Login de administrador | No |
| `/admin/dashboard` | AdminDashboardPage | Panel de administración | Sí (JWT) |

## 📦 Componentes Principales

### `<Button>`
Botón principal con estilo de acento.
```jsx
import { Button } from './components/ui/button'
<Button disabled={loading}>Enviar</Button>
```

### `<Input>`
Input con label y estilos consistentes.
```jsx
import { Input } from './components/ui/Input'
<Input label="Username" value={user} onChange={setUser} />
```

### `<ChatBubble>`
Burbuja de mensaje con avatar y timestamp.
```jsx
import ChatBubble from './components/chat/ChatBubble'
<ChatBubble 
  username="User1" 
  message="Hola!" 
  timestamp="10:30"
  isMe={false}
/>
```

### `<MessageInput>`
Input para enviar mensajes con botones de archivo y enviar.
```jsx
import MessageInput from './components/chat/MessageInput'
<MessageInput onSendMessage={handleSend} />
```

## 🔐 Gestión de Estado (Zustand)

```javascript
// useAuthStore.js
import { useAuthStore } from './store/useAuthStore'

// En componente
const { token, login, logout, isAuthenticated } = useAuthStore()

// Login
await login(username, password)

// Logout
logout()

// Verificar autenticación
if (isAuthenticated()) {
  // Usuario autenticado
}
```

## 🎯 Flujos de Usuario

### Usuario Normal
1. Landing Page → Click "Unirse al Chat"
2. Join Room Page → Ingresar username y room ID
3. Chat Room → Chatear en tiempo real

### Administrador
1. Landing Page → Click "Admin"
2. Admin Login → Ingresar credenciales
3. Admin Dashboard → Crear salas, ver estadísticas
4. Click en sala → Ver detalles

## 🐛 Troubleshooting

### Error 404 en rutas
- Verificar que el dev server esté corriendo (`npm run dev`)
- Verificar que React Router esté configurado correctamente en `App.jsx`

### Error de conexión WebSocket
- Verificar que el API Gateway esté corriendo en puerto 8080
- Verificar variable de entorno `VITE_API_URL`

### Estilos no se aplican
- Verificar que los archivos CSS estén importados
- Verificar que las variables CSS estén definidas en `index.css`

### Token JWT expirado
- El token se guarda en localStorage
- Hacer logout y volver a iniciar sesión

## 📝 Notas de Desarrollo

- Los componentes UI (`button.jsx`, `Input.jsx`) usan lowercase para evitar problemas de case-sensitivity
- El gradiente de fondo está solo en ChatRoomPage, las demás páginas usan colores sólidos
- El botón de enviar tiene un fondo circular azul (36x36px)
- Todos los colores se definen como CSS variables para fácil mantenimiento

## 🔗 Enlaces Relacionados

- [API Gateway README](../../backend/api-gateway/README.md)
- [Backend README](../../backend/README.md)
- [Documentación React Router](https://reactrouter.com/)
- [Documentación Socket.IO Client](https://socket.io/docs/v4/client-api/)
