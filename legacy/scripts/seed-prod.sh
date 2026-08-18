#!/bin/bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:4000}"
ADMIN_EMAIL="admin@lawtrel.com"
ADMIN_PASSWORD="Admin@2026"

echo "============================================"
echo "  Frame24 - Seed Production Database"
echo "============================================"

# Wait for API
echo "Waiting for API at ${API_URL}..."
for i in $(seq 1 30); do
    if curl -sf "${API_URL}/health" > /dev/null 2>&1; then
        echo "API is up!"
        break
    fi
    echo "  Waiting... ($i/30)"
    sleep 5
done

# Login to get token
echo ""
echo "Logging in as admin..."
LOGIN_RESPONSE=$(curl -sf -X POST "${API_URL}/api/auth/sign-in/email" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}" \
    -c /tmp/frame24-cookies.txt \
    -b /tmp/frame24-cookies.txt)

if [ -z "$LOGIN_RESPONSE" ]; then
    echo "ERROR: Login failed. Make sure the admin user exists."
    echo "You may need to run the create-betterauth-admin.ts script first."
    exit 1
fi

echo "Login successful!"

# Check if tenant data already exists
echo ""
echo "Checking if tenant data exists..."
MOVIES=$(curl -sf -b /tmp/frame24-cookies.txt \
    -H "x-tenant-slug: lawtrel-admin" \
    "${API_URL}/v1/movies?limit=1" 2>/dev/null || echo "[]")

if [ "$MOVIES" != "[]" ] && [ -n "$MOVIES" ]; then
    echo "Tenant data already exists. Skipping seed."
    echo ""
    echo "============================================"
    echo "  Seed skipped - data already present"
    echo "============================================"
    exit 0
fi

echo "No tenant data found. Seeding via API..."
echo ""
echo "NOTE: For a full seed, you should run the TypeScript"
echo "seed scripts from a development machine with access"
echo "to the production database. Use:"
echo ""
echo "  DIRECT_URL=postgresql://frame24:PASSWORD@174.138.79.19:5432/frame24 pnpm --filter api run ts-node apps/api/src/scripts/seed-catalog.ts"
echo ""
echo "Alternatively, run seed scripts inside the API container:"
echo "  docker exec frame24-api node dist/scripts/seed-catalog.js"
echo ""
echo "============================================"
echo "  Manual seed required"
echo "============================================"
