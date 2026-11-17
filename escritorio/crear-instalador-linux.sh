#!/bin/bash
# Crea el instalador de Gosaryc para Linux (AppImage y .deb) con el logo oficial.
# Ejecutar desde la carpeta escritorio/:  ./crear-instalador-linux.sh
# Para apuntar a otra dirección: GOSARYC_URL=https://tu-dominio.com ./crear-instalador-linux.sh
set -e
cd "$(dirname "$0")"

echo "[1/3] Preparando la API local de WhatsApp (agente)..."
export PUPPETEER_SKIP_DOWNLOAD=true
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
(cd ../whatsapp-local && npm install --omit=dev)

echo "[2/3] Instalando dependencias de escritorio (puede tardar unos minutos)..."
npm install

echo "[3/3] Creando instaladores de Linux (AppImage y .deb)..."
npm run instalador:linux

echo ""
echo "Listo. Los instaladores están en la carpeta \"instaladores\":"
ls -1 instaladores/ | grep -i -E "AppImage|\.deb" || true
