#!/bin/bash

# Script para verificar y configurar MinIO

echo "=== Verificando configuración de MinIO ==="
echo ""

# Esperar a que MinIO esté listo
echo "1. Esperando a que MinIO esté disponible..."
sleep 5

# Configurar alias de MinIO
echo "2. Configurando alias de MinIO..."
docker exec minio-create-bucket /usr/bin/mc alias set myminio http://minio:9000 minioadmin minioadmin

# Verificar si el bucket existe
echo "3. Verificando bucket 'chat-files'..."
docker exec minio-create-bucket /usr/bin/mc ls myminio/chat-files

# Hacer el bucket público (download)
echo "4. Configurando bucket como público..."
docker exec minio-create-bucket /usr/bin/mc anonymous set download myminio/chat-files

# Verificar permisos
echo "5. Verificando permisos del bucket..."
docker exec minio-create-bucket /usr/bin/mc anonymous get myminio/chat-files

echo ""
echo "=== Configuración completada ==="
echo "Puedes acceder a MinIO Console en: http://localhost:9001"
echo "Usuario: minioadmin"
echo "Contraseña: minioadmin"
