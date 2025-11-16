# --- ETAPA 1: Construcción (Builder) ---
# Empezamos con una imagen 'slim' que tiene herramientas de build
FROM node:18-slim AS builder

# Establecemos el directorio de trabajo
WORKDIR /app

# Copiamos la lista de compras
COPY package.json package-lock.json* ./

# Instalamos TODAS las dependencias (incluyendo dev, como 'nodemon')
RUN npm ci

# Copiamos el resto de tu código (index.js, etc.)
COPY . .

# (Opcional) Si tuvieras un paso de 'build', iría aquí
# RUN npm run build

# --- ETAPA 2: Producción (Production) ---
# Empezamos con una imagen 'alpine' NUEVA, súper ligera y segura
FROM node:18-alpine

# Establecemos el directorio de trabajo
WORKDIR /app

# Creamos un usuario 'appuser' para no correr como root (¡Seguridad!)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# --- Copiamos solo lo necesario desde la Etapa 1 ---
# Copiamos las dependencias de producción ya instaladas
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
# Copiamos tu código
COPY --from=builder --chown=appuser:appgroup /app/index.js ./index.js
COPY --from=builder --chown=appuser:appgroup /app/package.json ./package.json

# Le decimos a Docker que corra como el usuario no-root
USER appuser

# --- Etapa 5 (Tu Pregunta) ---
# ¡Aquí está la respuesta a tu .env!
# Documentamos que el contenedor usará la variable G_PORT
EXPOSE ${G_PORT}

# El comando final para arrancar tu app
CMD ["node", "index.js"]