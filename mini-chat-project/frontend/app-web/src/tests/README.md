# Frontend Testing Guide

## 🧪 Configuración de Testing

Este proyecto usa **Vitest** + **React Testing Library** para pruebas unitarias.

## 📦 Dependencias Instaladas

```json
{
  "@testing-library/jest-dom": "^6.1.5",
  "@testing-library/react": "^14.1.2",
  "@testing-library/user-event": "^14.5.1",
  "@vitest/coverage-v8": "^1.0.4",
  "@vitest/ui": "^1.0.4",
  "jsdom": "^23.0.1",
  "vitest": "^1.0.4"
}
```

## 🚀 Instalación

```bash
# Instalar todas las dependencias de testing
npm install
```

## 📝 Comandos de Testing

```bash
# Ejecutar todos los tests
npm test

# Ejecutar tests con interfaz UI
npm run test:ui

# Ejecutar tests con reporte de cobertura
npm run test:coverage

# Ejecutar tests en modo watch (recomendado para desarrollo)
npm test -- --watch

# Ejecutar un archivo de test específico
npm test -- Button.test.jsx

# Ejecutar tests que coincidan con un patrón
npm test -- --grep "should render"
```

## 📊 Cobertura Mínima Requerida

El proyecto está configurado para requerir **70% de cobertura mínima** en:

- ✅ Lines: 70%
- ✅ Functions: 70%
- ✅ Branches: 70%
- ✅ Statements: 70%

## 📁 Estructura de Tests

```
src/tests/
├── setup.js                    # Configuración global de tests
├── components/                 # Tests de componentes
│   ├── Button.test.jsx
│   ├── Input.test.jsx
│   ├── ChatBubble.test.jsx
│   └── MessageInput.test.jsx
├── pages/                      # Tests de páginas
│   ├── LandingPage.test.jsx
│   ├── JoinRoomPage.test.jsx
│   └── AdminLoginPage.test.jsx
├── store/                      # Tests de estado (Zustand)
│   └── useAuthStore.test.jsx
└── App.test.jsx               # Test del componente principal
```

## 🎯 Cobertura por Módulo

### Componentes UI (100% objetivo)
- ✅ Button: renders, clicks, disabled state
- ✅ Input: renders, onChange, validation, types

### Componentes Chat (100% objetivo)
- ✅ ChatBubble: renders, isMe logic, styles
- ✅ MessageInput: send message, enter key, validation

### Páginas (80% objetivo)
- ✅ LandingPage: navigation buttons
- ✅ JoinRoomPage: form inputs, validation
- ✅ AdminLoginPage: login form, authentication

### Store (100% objetivo)
- ✅ useAuthStore: login, logout, persistence

## 🔍 Ejemplos de Tests

### Test de Componente Simple

```javascript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('should render text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })
})
```

### Test con Interacciones

```javascript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

it('should call onClick', () => {
  const handleClick = vi.fn()
  render(<Button onClick={handleClick}>Click</Button>)
  
  fireEvent.click(screen.getByText('Click'))
  expect(handleClick).toHaveBeenCalledTimes(1)
})
```

### Test con Router

```javascript
import { BrowserRouter } from 'react-router-dom'

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

it('renders with router', () => {
  renderWithRouter(<MyPage />)
  expect(screen.getByText('Title')).toBeInTheDocument()
})
```

## 🛠️ Utilidades de Testing

### Queries Disponibles

- `getByText` - Encuentra elemento por texto
- `getByRole` - Encuentra por rol ARIA (button, textbox, etc)
- `getByLabelText` - Encuentra input por su label
- `getByPlaceholderText` - Encuentra por placeholder
- `getByTestId` - Encuentra por data-testid

### User Events

```javascript
import { fireEvent } from '@testing-library/react'

fireEvent.click(button)
fireEvent.change(input, { target: { value: 'text' } })
fireEvent.keyPress(input, { key: 'Enter', code: 'Enter' })
```

### Mocks

```javascript
import { vi } from 'vitest'

// Mock de función
const mockFn = vi.fn()

// Mock de módulo
vi.mock('./module', () => ({
  default: vi.fn()
}))
```

## 📈 Ver Reporte de Cobertura

Después de ejecutar `npm run test:coverage`, se genera un reporte HTML:

```bash
# Abrir reporte de cobertura en el navegador
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
start coverage/index.html  # Windows
```

## 🐛 Troubleshooting

### "Cannot find module"
```bash
npm install
```

### "ReferenceError: localStorage is not defined"
Ya está configurado en `setup.js`

### "socket.io-client mock error"
Ya está configurado en `setup.js`

### Tests fallan por CSS
Los archivos CSS están excluidos automáticamente por Vitest

### "React is not defined"
Asegúrate de importar React en componentes que usan JSX

## 📝 Mejores Prácticas

1. ✅ **Test comportamiento, no implementación**
   - Prueba qué hace el componente, no cómo lo hace

2. ✅ **Usa queries accesibles**
   - Prefiere `getByRole` y `getByLabelText`

3. ✅ **Mockea dependencias externas**
   - API calls, Socket.IO, localStorage

4. ✅ **Tests independientes**
   - Cada test debe poder correr solo

5. ✅ **Nombres descriptivos**
   - `should render username input`
   - `should call onSubmit when form is submitted`

6. ✅ **AAA Pattern**
   - **Arrange**: Setup
   - **Act**: Ejecutar acción
   - **Assert**: Verificar resultado

## 🎓 Recursos

- [Vitest Docs](https://vitest.dev/)
- [Testing Library](https://testing-library.com/react)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)

## ✅ Checklist antes de Push

- [ ] `npm test` pasa todos los tests
- [ ] `npm run test:coverage` muestra >70% cobertura
- [ ] No hay tests comentados o skipped sin razón
- [ ] Los tests nuevos tienen nombres descriptivos
