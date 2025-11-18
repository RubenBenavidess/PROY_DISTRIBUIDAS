# --- ETAPA 1: Construcción (Builder) ---
# Define la imagen base de Node.js (versión 18-slim) y nombra esta etapa "builder".
FROM node:18-slim AS builder

# Establece el directorio de trabajo dentro del contenedor en /app.
WORKDIR /app

# Copia los archivos de manifiesto del paquete al directorio de trabajo.
COPY package.json package-lock.json ./

# Ejecuta 'npm ci' para instalar limpiamente las dependencias (incluyendo devDependencies)
# basándose en el package-lock.json.
RUN npm ci

# Copia el resto del código fuente del proyecto al directorio de trabajo.
# (Los archivos ignorados por .dockerignore no se copiarán).
COPY . .

# Elimina las dependencias de desarrollo (devDependencies) de la carpeta node_modules.
RUN npm prune --production

# --- ETAPA 2: Producción (Production) ---
# Define la imagen base final (Node.js 18-alpine), que es muy ligera.
FROM node:18-alpine

# Establece el directorio de trabajo predeterminado en /app.
WORKDIR /app

# Crea un grupo de sistema (-S) 'appgroup' y un usuario de sistema (-S) 'appuser'.
# Añade 'appuser' a 'appgroup' por razones de seguridad (para no correr como root).
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# --- Copia de artefactos desde la etapa 'builder' ---

COPY --from=builder /app/ ./

# Asegurar permisos de lectura en el directorio de claves ANTES de cambiar de usuario
# Usar condicional para evitar errores si no existen archivos
RUN if [ -d "keys" ]; then \
        chmod -R 755 keys; \
        find keys -type f -exec chmod 644 {} \; ; \
    fi && \
    chown -R appuser:appgroup .

# Configura el contenedor para que se ejecute como el usuario 'appuser'.
USER appuser

# Documenta que el contenedor expondrá el puerto especificado en la variable $PORT.
EXPOSE ${PORT}

# Define el comando por defecto para ejecutar cuando el contenedor se inicie.
CMD ["node", "server.js"]
