# 🔒 Encriptación Extremo a Extremo (E2EE) + Firma Digital

## 📋 Resumen

Esta implementación proporciona **encriptación extremo a extremo** para mensajes de chat, donde:

- ✅ **Solo los usuarios pueden desencriptar** los mensajes
- ✅ **El servidor NUNCA puede leer** el contenido de los mensajes
- ✅ **Firma digital RSA** verifica la integridad y autenticidad
- ✅ **AES-GCM** para encriptación rápida y segura

---

## 🏗️ Arquitectura

```
┌─────────────┐                  ┌─────────────┐                  ┌─────────────┐
│  Usuario A  │                  │   Servidor  │                  │  Usuario B  │
│             │                  │             │                  │             │
│  1. Escribe │                  │             │                  │             │
│  "Hola"     │                  │             │                  │             │
│             │                  │             │                  │             │
│  2. Encripta│                  │             │                  │             │
│  con AES    │                  │             │                  │             │
│  → "Xf7k9"  │                  │             │                  │             │
│             │                  │             │                  │             │
│  3. Firma   │                  │             │                  │             │
│  con RSA    │                  │             │                  │             │
│  → "sig123" │                  │             │                  │             │
│             │                  │             │                  │             │
│  4. Envía   ├─────────────────→│  Almacena   ├─────────────────→│  5. Recibe  │
│  encriptado │  "Xf7k9"        │  "Xf7k9"    │  "Xf7k9"        │  encriptado │
│  + firma    │  + "sig123"      │  (sin leer) │  + "sig123"      │  + firma    │
│             │                  │             │                  │             │
│             │                  │             │                  │  6. Verifica│
│             │                  │             │                  │  firma RSA  │
│             │                  │             │                  │  ✅ Válida  │
│             │                  │             │                  │             │
│             │                  │             │                  │  7. Decripta│
│             │                  │             │                  │  con AES    │
│             │                  │             │                  │  → "Hola"   │
└─────────────┘                  └─────────────┘                  └─────────────┘
```

---

## 🔑 Gestión de Claves

### 1. Clave AES (Encriptación de Mensajes)

- **Algoritmo**: AES-GCM-256
- **Derivación**: SHA-256(`roomId:pin`)
- **Compartida**: Todos los usuarios de la sala calculan la misma clave
- **Nunca enviada**: Se calcula localmente en cada cliente
- **Uso**: Encriptar y desencriptar mensajes

```javascript
// Cada usuario calcula esto en su navegador:
const seed = `${roomId}:${pin}`;
const hash = SHA-256(seed);
const aesKey = importKey(hash); // Clave de 256 bits
```

### 2. Par de Claves RSA (Firma Digital)

- **Algoritmo**: RSA-2048 con RSASSA-PKCS1-v1_5
- **Generación**: Cada usuario genera su propio par al entrar a la sala
- **Clave Privada**: Nunca sale del navegador del usuario
- **Clave Pública**: Se envía con cada mensaje para verificación
- **Uso**: Firmar mensajes propios y verificar mensajes de otros

```javascript
// Cada usuario genera esto:
RSA KeyPair {
  privateKey: [solo en memoria, nunca se envía],
  publicKey: [se comparte con cada mensaje]
}
```

---

## 🔄 Flujo de Envío de Mensaje

### Frontend (Usuario A)

1. **Usuario escribe**: "Hola, ¿cómo estás?"
2. **Encriptar con AES**:
   ```javascript
   const encrypted = await cryptoService.encryptMessage("Hola, ¿cómo estás?");
   // Resultado: "a3k9fj2...Xz7" (Base64)
   ```
3. **Firmar con RSA**:
   ```javascript
   const signature = await cryptoService.signMessage(encrypted);
   // Resultado: "h8g4d2...Qw9" (Base64)
   ```
4. **Enviar al servidor**:
   ```javascript
   socketService.sendMessage(encrypted, signature, publicKey);
   ```

### Backend (Servidor)

5. **Recibir datos**:
   ```javascript
   {
     content: "a3k9fj2...Xz7",     // Encriptado (NO PUEDE LEER)
     signature: "h8g4d2...Qw9",    // Firma
     publicKey: "MIIBIj..."        // Clave pública
   }
   ```
6. **Almacenar encriptado** en MongoDB
7. **Reenviar a todos** en la sala (sin desencriptar)

### Frontend (Usuario B)

8. **Recibir mensaje encriptado**:
   ```javascript
   {
     content: "a3k9fj2...Xz7",
     signature: "h8g4d2...Qw9",
     publicKey: "MIIBIj..."
   }
   ```
9. **Verificar firma RSA**:
   ```javascript
   const isValid = await cryptoService.verifySignature(
     content,
     signature,
     publicKey
   );
   // Si isValid === false → Mensaje alterado ⚠️
   ```
10. **Desencriptar con AES**:
    ```javascript
    const decrypted = await cryptoService.decryptMessage(content);
    // Resultado: "Hola, ¿cómo estás?"
    ```
11. **Mostrar en UI** ✅

---

## 🛡️ Seguridad

### ✅ Características de Seguridad

| Característica                     | Implementación                     | Beneficio                                 |
| ---------------------------------- | ---------------------------------- | ----------------------------------------- |
| **Encriptación E2EE**              | AES-GCM-256                        | Servidor no puede leer mensajes           |
| **Firma Digital**                  | RSA-2048 PKCS1-v1_5                | Verifica identidad del remitente          |
| **IV Aleatorio**                   | 12 bytes únicos por mensaje        | Previene ataques de análisis de patrones  |
| **Derivación de Clave Segura**     | SHA-256 del roomId + PIN           | Clave única por sala                      |
| **Claves No Extractables**         | AES keys con `extractable: false`  | No se pueden exportar desde el navegador  |
| **Clave Privada RSA en Memoria**   | Nunca se serializa                 | No persiste después de cerrar navegador   |
| **Verificación de Integridad**     | Firma sobre mensaje encriptado     | Detecta alteraciones                      |
| **Autenticación de Origen**        | Clave pública verificada con firma | Confirma quién envió el mensaje           |

### ⚠️ Advertencias de Seguridad

1. **PIN débil = Clave débil**:
   - Si el PIN es "1234", la clave AES será débil
   - **Recomendación**: Usar PINs de al menos 8 caracteres

2. **Sin Perfect Forward Secrecy (PFS)**:
   - Si alguien captura el PIN, puede desencriptar mensajes futuros
   - **Mejora futura**: Implementar intercambio de claves Diffie-Hellman

3. **Claves en memoria del navegador**:
   - Vulnerable a ataques de memoria (poco común)
   - **Mitigación**: Las claves se limpian al salir de la sala

4. **Sin autenticación de usuarios**:
   - Cualquiera con roomId + PIN puede unirse
   - **Mejora futura**: Agregar autenticación de usuarios

---

## 📂 Archivos Modificados

### Frontend

1. **`/frontend/app-web/src/utils/cryptoService.js`** (NUEVO)
   - Servicio singleton para criptografía
   - Métodos: `generateRSAKeyPair()`, `deriveAESKey()`, `encryptMessage()`, `decryptMessage()`, `signMessage()`, `verifySignature()`

2. **`/frontend/app-web/src/pages/JoinRoomPage.jsx`**
   - Genera claves RSA al entrar a la sala
   - Deriva clave AES del roomId + PIN

3. **`/frontend/app-web/src/pages/ChatRoomPage.jsx`**
   - Encripta y firma mensajes antes de enviar
   - Desencripta y verifica mensajes recibidos
   - Limpia claves al salir

4. **`/frontend/app-web/src/services/socketService.js`**
   - Actualizado `sendMessage()` para incluir `signature` y `publicKey`

### Backend

5. **`/backend/message-management-microservice/src/websocket/handlers/handleSendMessage.js`**
   - Acepta `signature` y `publicKey` en los datos
   - Reenvía todo sin desencriptar (E2EE completo)
   - Logging con emoji 🔒 para mensajes encriptados

---

## 🧪 Cómo Probar

### 1. Iniciar el Backend

```bash
cd backend
sudo docker compose up --build
```

### 2. Iniciar el Frontend

```bash
cd frontend/app-web
npm run dev
```

### 3. Abrir Dos Navegadores (o pestañas en modo incógnito)

**Usuario A**:
- RoomId: `test123`
- PIN: `secreto123`
- Nickname: `Alice`

**Usuario B**:
- RoomId: `test123`
- PIN: `secreto123` (mismo que Alice)
- Nickname: `Bob`

### 4. Enviar Mensajes

- Escribe en Alice: "Hola Bob"
- Observa en la consola del navegador:
  ```
  🔒 [Crypto] Mensaje encriptado
  ✍️ [Crypto] Mensaje firmado
  📨 Enviando mensaje encriptado al servidor...
  ```
- Observa en Bob:
  ```
  📩 Nuevo mensaje recibido (encriptado)
  ✅ Firma verificada correctamente
  🔓 Mensaje desencriptado: Hola Bob
  ```

### 5. Verificar el Servidor

En los logs del servidor debería aparecer:
```
[AUDIT] 🔒 Encrypted message sent: room=test123, hashedNickname=abc123..., signed=true
```

El servidor **NUNCA** imprime el contenido del mensaje en texto plano.

---

## 🎯 Casos de Prueba

### ✅ Caso 1: Mensaje Normal
- Alice envía: "Hola"
- Bob recibe y desencripta: "Hola" ✅
- Firma válida ✅

### ⚠️ Caso 2: Firma Inválida (Mensaje Alterado)
- Simular alteración del mensaje en tránsito
- Bob verifica firma → **INVÁLIDA**
- Se muestra: `[⚠️ FIRMA INVÁLIDA - No confiar en este mensaje]`

### ❌ Caso 3: PIN Incorrecto
- Alice usa PIN: `secreto123`
- Bob usa PIN: `otropin456`
- Bob recibe mensaje encriptado pero NO puede desencriptarlo
- Se muestra: `[❌ Error: No se pudo desencriptar el mensaje]`

### 🔒 Caso 4: Servidor Captura Mensaje
- Servidor intercepta: `"Xf7k9j2..."`
- Servidor NO tiene la clave AES (derivada del PIN)
- Servidor NO puede leer: ✅ **E2EE Funciona**

---

## 📊 Comparación: Antes vs Después

| Aspecto                    | ❌ Antes                       | ✅ Después                                   |
| -------------------------- | ------------------------------ | -------------------------------------------- |
| Mensajes en servidor       | Texto plano                    | Encriptados (Base64)                         |
| Servidor puede leer        | Sí                             | No (E2EE)                                    |
| Integridad verificada      | No                             | Sí (Firma RSA)                               |
| Autenticidad verificada    | Solo por nickname              | Sí (Clave pública)                           |
| Protección en tránsito     | Solo HTTPS                     | HTTPS + Encriptación adicional               |
| Protección en reposo (BD)  | Texto plano                    | Encriptado                                   |
| Admin puede leer mensajes  | Sí                             | No (solo ve texto encriptado)                |

---

## 🚀 Mejoras Futuras

1. **Perfect Forward Secrecy (PFS)**:
   - Generar nueva clave AES para cada sesión con ECDH
   - Incluso si se compromete el PIN, mensajes pasados quedan seguros

2. **Verificación de Identidad Más Robusta**:
   - Certificados digitales
   - Sistema de "trust on first use" (TOFU)

3. **Encriptación de Archivos**:
   - Aplicar misma lógica E2EE a archivos enviados
   - Encriptar archivos en chunks para optimizar

4. **Key Rotation**:
   - Renovar claves periódicamente
   - Minimizar ventana de exposición si se comprometen

5. **Autenticación de Usuarios**:
   - JWT + Passport.js
   - Solo usuarios autenticados pueden unirse

6. **Modo "Mensajes Efímeros"**:
   - Auto-destruir mensajes después de X tiempo
   - No almacenar en servidor (solo relay)

---

## 🔍 Debugging

### Ver Claves Generadas

Abre la consola del navegador al entrar a una sala:

```javascript
// Ver clave pública RSA
console.log(cryptoService.getPublicKeyPEM());

// Ver si las claves están inicializadas
console.log('RSA:', !!cryptoService.rsaKeyPair);
console.log('AES:', !!cryptoService.aesKey);
```

### Ver Mensajes Encriptados

En la consola del navegador al enviar:

```javascript
// Antes de enviar
console.log('Texto plano:', "Hola mundo");

// Después de encriptar
console.log('Encriptado:', encryptedMessage);
// Resultado: "GkS8f2j9...Xz7pQw=="
```

### Inspeccionar Tráfico de Red

1. Abrir DevTools → Network
2. Filtrar por WebSocket (`WS`)
3. Ver mensajes enviados:
   ```json
   {
     "content": "GkS8f2j9...Xz7pQw==",
     "signature": "h8g4d2...Qw9",
     "publicKey": "MIIBIj..."
   }
   ```

**✅ Confirmación**: Si ves contenido ilegible, la encriptación funciona.

---

## 📚 Referencias

- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [AES-GCM](https://en.wikipedia.org/wiki/Galois/Counter_Mode)
- [RSA Digital Signatures](https://en.wikipedia.org/wiki/RSA_(cryptosystem)#Signing_messages)
- [End-to-End Encryption](https://en.wikipedia.org/wiki/End-to-end_encryption)

---

## ✅ Conclusión

Esta implementación proporciona **encriptación extremo a extremo real** donde:

1. 🔒 El servidor **nunca** puede leer mensajes
2. ✍️ Cada mensaje está **firmado digitalmente**
3. ✅ Los usuarios pueden **verificar la autenticidad**
4. 🛡️ Mensajes están protegidos **en tránsito y en reposo**

**⚠️ Importante**: La seguridad depende de que los usuarios usen PINs fuertes y mantengan sus dispositivos seguros.
