# Tests - API Gateway

Este directorio contiene los tests unitarios e integración para el API Gateway.

## 📁 Estructura de Tests

```
__tests__/
├── gateway.test.js      # Tests del gateway principal
└── middleware.test.js   # Tests de middlewares
```

## 🧪 Archivos de Test

### `gateway.test.js`
Tests para el API Gateway:
- ✅ Health check endpoint
- ✅ Security headers (Helmet)
- ✅ CORS configuration
- ✅ Proxy a /auth (authentication service)
- ✅ Proxy a /api (message service)
- ✅ Rate limiting
- ✅ Soporte de métodos HTTP (GET, POST, PUT, DELETE)
- ✅ Manejo de errores 404
- ✅ Headers personalizados

**Cobertura**: Routing, proxying, seguridad

### `middleware.test.js`
Tests para los middlewares del gateway:
- ✅ Rate limiting configuration
- ✅ Headers de rate limit
- ✅ Helmet security headers
- ✅ CORS middleware
- ✅ Morgan logging
- ✅ Configuración de URLs de servicios
- ✅ Docker service names

**Cobertura**: Middlewares, configuración, seguridad

## 🚀 Comandos

### Ejecutar todos los tests
```bash
npm test
```

### Ejecutar tests en modo watch
```bash
npm run test:watch
```

### Ver cobertura de código
```bash
npm test -- --coverage
```

## 📊 Cobertura Esperada

- **Statements**: > 75%
- **Branches**: > 65%
- **Functions**: > 70%
- **Lines**: > 75%

## 🔧 Configuración

Los tests utilizan:
- **Jest**: Framework de testing
- **Supertest**: Testing de endpoints HTTP
- **Mocks**: Para proxy middleware y rate limiter

## 🛡️ Tests de Seguridad

Los tests verifican:
- ✅ Headers de seguridad (Helmet)
- ✅ CORS habilitado
- ✅ Rate limiting activo
- ✅ Proxy seguro a microservicios

## 📝 Notas

- Los tests mockean el proxy middleware para no requerir servicios reales
- Rate limiter configurado con límites bajos para testing
- Tests independientes de la red Docker
- No requiere variables de entorno para ejecutar
