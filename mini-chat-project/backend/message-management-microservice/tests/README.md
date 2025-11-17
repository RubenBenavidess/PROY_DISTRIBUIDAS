# Tests - Message Management Microservice

Este directorio contiene todas las pruebas unitarias y de integración para el microservicio de gestión de mensajes.

## Estructura

```
tests/
├── setup.js                          # Configuración global de Jest
├── helpers/
│   └── mockFactories.js              # Factories para crear mocks
├── unit/                             # Tests unitarios
│   ├── models/                       # Tests de modelos Mongoose
│   │   ├── Message.test.js
│   │   └── Room.test.js
│   ├── security/                     # Tests de seguridad
│   │   ├── bcrypter.test.js
│   │   └── jwtManager.test.js
│   ├── services/                     # Tests de servicios
│   │   ├── messageService.test.js
│   │   ├── roomService.test.js
│   │   └── fileVerificationClient.test.js
│   ├── controllers/                  # Tests de controladores
│   │   ├── messageController.test.js
│   │   └── roomController.test.js
│   ├── middleware/                   # Tests de middleware
│   │   ├── requireAuth.test.js
│   │   └── errorMiddleware.test.js
│   ├── lib/                          # Tests de librerías
│   │   ├── s3put.test.js
│   │   └── s3get.test.js
│   └── websocket/handlers/           # Tests de handlers WebSocket
│       ├── handleJoinRoom.test.js
│       ├── handleSendMessage.test.js
│       ├── handleUtilityHandlers.test.js
│       └── handleLeaveAndDisconnect.test.js
└── integration/                      # Tests de integración (pendientes)
    ├── routes/
    ├── websocket/
    └── database/
```

## Instalación de Dependencias

```bash
npm install
```

Esto instalará:
- `jest` - Framework de testing
- `@jest/globals` - Utilidades globales de Jest
- `supertest` - Testing de APIs HTTP
- `mongodb-memory-server` - MongoDB en memoria para tests
- `socket.io-client` - Cliente Socket.IO para tests

## Ejecutar Tests

### Todos los tests
```bash
npm test
```

### Tests con coverage
```bash
npm test -- --coverage
```

### Tests en modo watch
```bash
npm test -- --watch
```

### Tests específicos
```bash
# Tests de un archivo específico
npm test Message.test.js

# Tests de una carpeta
npm test tests/unit/models

# Tests que coincidan con un patrón
npm test --testNamePattern="should save"
```

### Ejecutar solo tests unitarios
```bash
npm test -- tests/unit
```

## Cobertura de Tests

### Objetivo de Cobertura
El proyecto tiene configurado un **umbral mínimo de 80%** de cobertura en:
- Statements (declaraciones)
- Branches (ramas)
- Functions (funciones)
- Lines (líneas)

### Ver Reporte de Cobertura
Después de ejecutar tests con coverage:

1. **En consola**: Verás un resumen
2. **Reporte HTML**: Abre `coverage/lcov-report/index.html` en tu navegador

```bash
# Generar y abrir reporte HTML (Linux/Mac)
npm test -- --coverage && open coverage/lcov-report/index.html
```

## Componentes Testeados

### Tests Unitarios Completados

#### Modelos (100% cobertura)
- **Message.js**: Validación de schemas, campos requeridos, tipos de datos
- **Room.js**: Validación, enums, métodos personalizados (comparePin, canAddMore)

#### Security (100% cobertura)
- **bcrypter.js**: Hash y comparación de contraseñas
- **jwtManager.js**: Validación de tokens JWT, manejo de errores

#### Services (100% cobertura)
- **messageService.js**: Guardar mensajes, multimedia, paginación, URLs firmadas
- **roomService.js**: CRUD de rooms, validación de PIN, gestión de participantes
- **fileVerificationClient.js**: Todas las funciones stub

#### Controllers (100% cobertura)
- **messageController.js**: Endpoints de mensajes, paginación
- **roomController.js**: Endpoints de rooms, autenticación

#### Middleware (100% cobertura)
- **requireAuth.js**: Autenticación con JWT
- **errorMiddleware.js**: Manejo de errores (Zod, 401, 404, 409, 500)

#### Librerías (100% cobertura)
- **s3put.js**: Upload de archivos a S3/MinIO
- **s3get.js**: Generación de URLs firmadas

#### WebSocket Handlers (100% cobertura)
- **handleJoinRoom.js**: Join room, validaciones, hashing de nicknames
- **handleSendMessage.js**: Envío de mensajes, broadcast
- **handleTyping.js**: Indicador de escritura
- **handleHeartbeat.js**: Mantenimiento de sesión
- **handleGetParticipants.js**: Lista de participantes
- **handleLeaveRoom.js**: Salida de sala
- **handleDisconnect.js**: Desconexión y cleanup

### Tests Pendientes

#### Tests de Integración
- Routes (messageRoutes, roomRoutes)
- WebSocket completo (flujos E2E)
- Database (conexión MongoDB)
- Server completo (inicialización)

#### Tests de Seguridad
- Rate limiting
- Validación de tamaños de archivo
- XSS/Injection
- Timeouts de sesión

## Debugging Tests

### Ejecutar con más información
```bash
npm test -- --verbose
```

### Ver solo tests fallidos
```bash
npm test -- --onlyFailures
```

### Ejecutar sin coverage para más velocidad
```bash
npm test -- --no-coverage
```

### Ver qué tests se ejecutaron
```bash
npm test -- --listTests
```