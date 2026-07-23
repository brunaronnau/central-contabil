#!/bin/sh
set -e

echo "Aplicando migrations do Prisma..."
node node_modules/prisma/build/cli.js migrate deploy

echo "Iniciando servidor Next.js..."
exec node server.js
