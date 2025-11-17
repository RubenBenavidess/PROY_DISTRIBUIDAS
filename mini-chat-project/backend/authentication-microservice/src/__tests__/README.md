# Tests - Authentication Microservice

Este directorio contiene los tests unitarios para el microservicio de autenticación.

## 📁 Estructura de Tests

```
__tests__/
├── authController.test.js  # Tests del controlador de autenticación
└── authService.test.js     # Tests del servicio de autenticación
```

## 🧪 Archivos de Test

### `authController.test.js`
Tests para el controlador de autenticación (`/auth/login`):
- ✅ Login exitoso con credenciales válidas
- ✅ Validación de request body (username, password)
- ✅ Manejo de credenciales inválidas
- ✅ Configuración de cookies HTTP-only
- ✅ Configuración de maxAge en cookies

**Cobertura**: Rutas HTTP, validación Zod, manejo de errores

### `authService.test.js`
Tests para la lógica de negocio de autenticación:
- ✅ Generación de token con credenciales válidas
- ✅ Error cuando el admin no existe
- ✅ Error cuando la contraseña es incorrecta
- ✅ Verificación de contraseña con bcrypt
- ✅ Generación de payload JWT correcto

**Cobertura**: Lógica de autenticación, interacción con base de datos, JWT

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

- **Statements**: > 80%
- **Branches**: > 70%
- **Functions**: > 80%
- **Lines**: > 80%

## 🔧 Configuración

Los tests utilizan:
- **Jest**: Framework de testing
- **Supertest**: Testing de endpoints HTTP
- **Mocks**: Para MongoDB y JWT

## 📝 Notas

- Los tests usan `jest.mock()` para aislar las dependencias
- No requieren conexión a base de datos real (mocks)
- Los tests de integración se ejecutan en memoria
- Usar `NODE_OPTIONS=--experimental-vm-modules` para ES modules
