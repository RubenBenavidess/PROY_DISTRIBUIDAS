# API Gateway - Mini Chat Project

## 📋 Descripción

Gateway centralizado que actúa como punto de entrada único para todos los servicios del sistema de chat distribuido. Maneja autenticación, enrutamiento de peticiones y proxy hacia los microservicios.

## 🛠️ Tecnologías

- **Node.js** con Express
- **http-proxy-middleware** - Proxy de peticiones HTTP
- **cors** - Manejo de CORS
- **dotenv** - Variables de entorno
- **Docker** - Containerización

## 🏗️ Arquitectura

```
Cliente (Frontend)
       ↓
  API Gateway (puerto 8080)
       ↓
  ┌────────────┬─────────────────────┐
  ↓            ↓                     ↓
Auth API    Message API         Otros servicios
(3000)       (3002)
```

## 📁 Estructura del Proyecto

```
api-gateway/
├── config/              # Configuraciones
│   └── routes.js       # Definición de rutas y proxies
├── index.js            # Punto de entrada principal
├── package.json        # Dependencias
├── Dockerfile          # Containerización
└── README.md           # Esta documentación
```

## 🚀 Instalación y Ejecución

### Requisitos Previos

- Node.js >= 18.x
- Docker (opcional, para containerización)

### Instalación Local

```bash
# Instalar dependencias
npm install
```

### Variables de Entorno

Crea un archivo `.env` en la raíz del api-gateway:

```env
# Puerto del Gateway
PORT=8080

# URLs de los microservicios
AUTH_SERVICE_URL=http://localhost:3000
MESSAGE_SERVICE_URL=http://localhost:3002

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
```

### Ejecución

```bash
# Desarrollo
npm start

# Con Docker
docker build -t api-gateway .
docker run -p 8080:8080 --env-file .env api-gateway
```

## 🔀 Rutas y Proxies

### Rutas de Autenticación
Todas las peticiones a `/auth/*` se redirigen al Authentication Microservice:

```javascript
// Ejemplos:
POST /auth/login          → http://auth-api:3000/auth/login
POST /auth/register       → http://auth-api:3000/auth/register
GET  /auth/verify         → http://auth-api:3000/auth/verify
```

### Rutas de API
Todas las peticiones a `/api/*` se redirigen al Message Management Microservice:

```javascript
// Ejemplos:
GET  /api/rooms           → http://message-service:3002/rooms
POST /api/rooms           → http://message-service:3002/rooms
GET  /api/rooms/:id       → http://message-service:3002/rooms/:id
```

## 🔐 Seguridad

### CORS
El gateway maneja CORS automáticamente:
- Origins permitidos definidos en variable de entorno `ALLOWED_ORIGINS`
- Headers permitidos: `Authorization`, `Content-Type`
- Métodos permitidos: `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`

### Headers de Seguridad
Se recomienda usar `helmet` para headers de seguridad adicionales:

```javascript
const helmet = require('helmet')
app.use(helmet())
```

### Autenticación JWT
El gateway **NO valida** tokens JWT directamente. La validación se hace en cada microservicio:
- El gateway simplemente reenvía el header `Authorization`
- Cada microservicio valida el token según sus necesidades

## 📝 Configuración de Rutas (routes.js)

```javascript
module.exports = {
  routes: [
    {
      path: '/auth',
      target: process.env.AUTH_SERVICE_URL || 'http://auth-api:3000',
      changeOrigin: true
    },
    {
      path: '/api',
      target: process.env.MESSAGE_SERVICE_URL || 'http://message-management-microservice:3002',
      changeOrigin: true,
      pathRewrite: { '^/api': '' }  // Elimina /api del path
    }
  ]
}
```

### Opciones de Proxy

- **`target`**: URL del servicio destino
- **`changeOrigin`**: Cambia el header `Host` al del target
- **`pathRewrite`**: Reescribe el path antes de enviar al servicio
- **`onProxyReq`**: Middleware para modificar request antes de enviar
- **`onProxyRes`**: Middleware para modificar response antes de devolver

## 🐳 Docker

### Dockerfile

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8080
CMD ["node", "index.js"]
```

### Docker Compose

```yaml
api-gateway:
  build: ./api-gateway
  ports:
    - "8080:8080"
  environment:
    - AUTH_SERVICE_URL=http://auth-api:3000
    - MESSAGE_SERVICE_URL=http://message-management-microservice:3002
  depends_on:
    - auth-api
    - message-management-microservice
```

## 🔍 Logging y Monitoreo

### Logs de Peticiones

El gateway registra todas las peticiones:

```javascript
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  next()
})
```

### Health Check

Endpoint para verificar estado del gateway:

```javascript
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  })
})
```

## 🚨 Manejo de Errores

### Errores de Proxy

```javascript
app.use((err, req, res, next) => {
  console.error('Gateway Error:', err)
  res.status(500).json({ 
    error: 'Gateway Error',
    message: err.message 
  })
})
```

### Timeouts

Configurar timeouts para evitar peticiones colgadas:

```javascript
{
  path: '/api',
  target: 'http://message-service:3002',
  timeout: 30000  // 30 segundos
}
```

## 📊 Métricas y Performance

### Rate Limiting

Se puede agregar rate limiting con `express-rate-limit`:

```javascript
const rateLimit = require('express-rate-limit')

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // máximo 100 peticiones por ventana
})

app.use('/api', limiter)
```

### Caché

Para endpoints que no cambian frecuentemente:

```javascript
const apicache = require('apicache')
let cache = apicache.middleware

app.use('/api/rooms', cache('5 minutes'))
```

## 🐛 Troubleshooting

### Gateway no inicia
- Verificar que el puerto 8080 no esté en uso: `lsof -i :8080`
- Verificar variables de entorno en `.env`

### Error de conexión a microservicios
- Verificar que los microservicios estén corriendo
- Verificar URLs en variables de entorno
- En Docker, verificar nombres de servicios en `compose.yaml`

### CORS errors
- Verificar que el origin del frontend esté en `ALLOWED_ORIGINS`
- Verificar que los headers necesarios estén permitidos

### Peticiones lentas
- Verificar latencia de red entre gateway y microservicios
- Considerar implementar caché
- Revisar logs de cada microservicio

## 🔗 Endpoints Principales

### Autenticación (Auth Service)
```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

### Salas de Chat (Message Service)
```http
# Crear sala (requiere JWT)
POST /api/rooms
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "text",
  "pin": "1234"
}

# Listar salas (requiere JWT)
GET /api/rooms
Authorization: Bearer <token>
```

## 📝 Mejoras Futuras

- [ ] Implementar circuit breaker para servicios caídos
- [ ] Agregar autenticación a nivel de gateway
- [ ] Implementar rate limiting por usuario
- [ ] Agregar métricas con Prometheus
- [ ] Implementar caché distribuido (Redis)
- [ ] Agregar retry logic para peticiones fallidas
- [ ] Implementar service discovery dinámico

## 🔗 Enlaces Relacionados

- [Frontend README](../../frontend/app-web/README.md)
- [Authentication Microservice](../authentication-microservice/README.md)
- [Message Management Microservice](../message-management-microservice/README.md)
- [http-proxy-middleware docs](https://github.com/chimurai/http-proxy-middleware)
