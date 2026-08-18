#!/bin/sh
set -e

echo "============================================"
echo "  Frame24 - Full Production Seed"
echo "============================================"

cd /app

SCRIPTS_DIR=/app/apps/api/dist/scripts

echo ""
echo "[1/8] Running setup-full (company + admin + catalog + movies)..."
node $SCRIPTS_DIR/setup-full.js

echo ""
echo "[2/8] Seeding languages..."
node $SCRIPTS_DIR/seed-languages.js

echo ""
echo "[3/8] Seeding seat statuses..."
node $SCRIPTS_DIR/seed-seat-status.js

echo ""
echo "[4/8] Seeding rooms and seats..."
node $SCRIPTS_DIR/seed-room.js

echo ""
echo "[5/8] Seeding products..."
node $SCRIPTS_DIR/seed-products.js

echo ""
echo "[6/8] Seeding POS lookups (statuses + payment methods)..."
node $SCRIPTS_DIR/seed-pos.js

echo ""
echo "[7/8] Seeding sales lookups (payment methods + types + statuses)..."
node $SCRIPTS_DIR/seed-sales-lookups.js

echo ""
echo "[8/8] Seeding showtimes..."
node $SCRIPTS_DIR/seed-showtimes.js

echo ""
echo "============================================"
echo "  Creating better-auth admin user..."
echo "============================================"
node $SCRIPTS_DIR/create-betterauth-admin.js

echo ""
echo "============================================"
echo "  SEED COMPLETE!"
echo "============================================"
echo ""
echo "  Admin Login: admin@lawtrel.com / Admin@2026"
echo "  Tenant Slug: lawtrel-admin"
echo ""
