#!/bin/sh
set -e

echo "[api] Pushing Prisma schema..."
cd /app/packages/db
./node_modules/.bin/prisma db push --config ./prisma.config.ts --accept-data-loss 2>&1 || true
cd /app

echo "[api] Starting NestJS API in production mode..."
exec node --require /app/apps/api/path-alias-register apps/api/dist/main.js
