#!/bin/bash
# Frame24 - Deploy to VPS (production or staging)
#
# Configurable via env vars:
#   VPS_IP            VPS hostname/IP (default: 174.138.79.19)
#   VPS_USER          SSH user (default: root)
#   REMOTE_DIR        Target directory on VPS (default: /opt/frame24)
#   COMPOSE_FILE      Compose file to use (default: docker-compose.prod.yml)
#   ENV_FILE_NAME     Env file to load on VPS (default: .env.production)
#   SOURCE_DIR        Local source (default: repo root)
#   SKIP_BUILD=1      Skip local docker-compose build (assume images exist)
#   SKIP_SEED=1       Skip database seeding check
#   SERVICES          comma-separated list of services to up (default: all)
#   CONTAINER_PREFIX  Container name prefix used in health+psql checks (default: frame24)
#
# Usage:
#   ./scripts/deploy-vps.sh
#   REMOTE_DIR=/opt/frame24-preview ./scripts/deploy-vps.sh
#   SKIP_SEED=1 SERVICES=api,web ./scripts/deploy-vps.sh
set -euo pipefail

VPS_IP="${VPS_IP:-174.138.79.19}"
REMOTE_DIR="${REMOTE_DIR:-/opt/frame24}"
SSH_USER="${VPS_USER:-root}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE_NAME="${ENV_FILE_NAME:-.env.production}"
DATABASE_NAME="${DATABASE_NAME:-frame24}"
SOURCE_DIR="${SOURCE_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
SKIP_BUILD="${SKIP_BUILD:-0}"
SKIP_SEED="${SKIP_SEED:-0}"
SERVICES="${SERVICES:-}"
CONTAINER_PREFIX="${CONTAINER_PREFIX:-frame24}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-frame24-postgres}"
SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=10"

echo "============================================"
echo "  Frame24 - Deploy to VPS ${VPS_IP}"
echo "  Target: ${REMOTE_DIR}"
echo "  Compose: ${COMPOSE_FILE}"
echo "============================================"

# 0. Verify SSH access
echo ""
echo ">>> [0/7] Verifying SSH access..."
if ! ssh ${SSH_OPTS} ${SSH_USER}@${VPS_IP} "echo OK" 2>/dev/null; then
    echo "ERROR: Cannot SSH into ${VPS_IP}. Make sure your SSH key is authorized."
    exit 1
fi
echo "    SSH access OK."

# 1. Setup VPS (Docker, directories)
echo ""
echo ">>> [1/7] Setting up VPS..."

ssh ${SSH_OPTS} ${SSH_USER}@${VPS_IP} bash -s <<SETUP
set -e

# Install Docker if not present
if ! command -v docker &>/dev/null; then
    echo "    Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "    Docker installed."
else
    echo "    Docker already installed: \$(docker --version)"
fi

# Install docker compose plugin
if ! docker compose version &>/dev/null; then
    echo "    Installing docker-compose plugin..."
    apt-get update -qq
    apt-get install -y -qq docker-compose-plugin
fi

# Install rsync if not present
if ! command -v rsync &>/dev/null; then
    apt-get update -qq
    apt-get install -y -qq rsync
fi

# Create app directory
mkdir -p ${REMOTE_DIR}

# Open firewall ports
ufw allow 80/tcp 2>/dev/null || true
ufw allow 3000/tcp 2>/dev/null || true
ufw allow 3004/tcp 2>/dev/null || true
ufw allow 4000/tcp 2>/dev/null || true
ufw allow 9000/tcp 2>/dev/null || true

# Increase virtual memory for better performance
sysctl -w vm.max_map_count=262144 2>/dev/null || true
sysctl -w vm.overcommit_memory=1 2>/dev/null || true

echo "    VPS setup complete."

SETUP

# 2. Sync project files to VPS
echo ""
echo ">>> [2/7] Syncing project files to VPS..."

rsync -az --delete \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.turbo' \
    --exclude='.git' \
    --exclude='.env' \
    --exclude='.env.local' \
    --exclude='.env.development.local' \
    --exclude='.env.test.local' \
    --exclude='.env.production.local' \
    --exclude='.env.staging' \
    --exclude='.env.staging.local' \
    --exclude='.env.production' \
    --exclude='*.pem' \
    --exclude='.DS_Store' \
    --exclude='coverage' \
    --exclude='.vercel' \
    "${SOURCE_DIR}/" \
    ${SSH_USER}@${VPS_IP}:${REMOTE_DIR}/

echo "    Files synced."

# 3. Create production .env on VPS
echo ""
echo ">>> [3/7] Setting up environment..."

ssh ${SSH_OPTS} ${SSH_USER}@${VPS_IP} bash -s <<ENVSETUP
set -e
cd ${REMOTE_DIR}

if [ ! -f ${ENV_FILE_NAME} ]; then
    echo "ERROR: ${ENV_FILE_NAME} missing on VPS at ${REMOTE_DIR}."
    echo "Create it locally and rsync won't override (it's gitignored)."
    echo "Minimal template at .env.coolify.example in the repo."
    exit 1
else
    echo "    ${ENV_FILE_NAME} exists, keeping it."
fi

ENVSETUP

# 4. Build Docker images on VPS
echo ""
echo ">>> [4/7] Building Docker images (this takes 5-10 min)..."

if [ "${SKIP_BUILD}" = "1" ]; then
    echo "    SKIP_BUILD=1 set, skipping remote build."
else
ssh ${SSH_OPTS} ${SSH_USER}@${VPS_IP} bash -s <<BUILD
set -e
cd ${REMOTE_DIR}

# Load env
set -a; source ${ENV_FILE_NAME}; set +a

echo "    Building API image..."
docker compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE_NAME} build api 2>&1 | grep -E "(DONE|ERROR|WARN|Step|Building|Successfully)" | tail -20

echo ""
echo "    Building Web image..."
docker compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE_NAME} build web 2>&1 | grep -E "(DONE|ERROR|WARN|Step|Building|Successfully)" | tail -20

echo ""
echo "    Building Admin image..."
docker compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE_NAME} build admin 2>&1 | grep -E "(DONE|ERROR|WARN|Step|Building|Successfully)" | tail -20

echo ""
echo "    All images built."

BUILD
fi

# 5. Start all services
echo ""
echo ">>> [5/7] Starting services..."

ssh ${SSH_OPTS} ${SSH_USER}@${VPS_IP} bash -s <<START
set -e
cd ${REMOTE_DIR}

set -a; source ${ENV_FILE_NAME}; set +a

docker compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE_NAME} up -d --force-recreate --remove-orphans ${SERVICES}

echo ""
echo "    Waiting for containers to start..."
sleep 15

docker compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE_NAME} ps

START

# 6. Run migrations and seed
echo ""
echo ">>> [6/7] Running migrations and seeding database..."

if [ "${SKIP_SEED}" = "1" ]; then
    echo "    SKIP_SEED=1 set, skipping seed step."
else
ssh ${SSH_OPTS} ${SSH_USER}@${VPS_IP} bash -s <<SEED
set -e
cd ${REMOTE_DIR}

# Wait for API to be healthy (it runs migrations on startup)
echo "    Waiting for API to complete migrations and start..."
for i in \$(seq 1 60); do
    if curl -sf http://localhost:4000/health > /dev/null 2>&1; then
        echo "    API is healthy! (after \${i}0s)"
        break
    fi
    if [ \$i -eq 60 ]; then
        echo "    ERROR: API did not start within 10 minutes."
        echo "    Logs:"
        docker compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE_NAME} logs api --tail=30
        exit 1
    fi
    echo "    Waiting... (\$i/60)"
    sleep 10
done

# Check if data already exists
RESULT=\$(docker exec ${POSTGRES_CONTAINER} psql -U frame24 -d ${DATABASE_NAME} -t -c "SELECT COUNT(*) FROM core.companies;" 2>/dev/null | tr -d ' ')
COMPANY_COUNT=\$(echo "\$RESULT" | head -1 | tr -d '\n')

if [ "\$COMPANY_COUNT" -gt "0" ] 2>/dev/null; then
    echo "    Database already has data (companies: \$COMPANY_COUNT). Skipping seed."
else
    echo "    Seeding database..."

    # Run setup-full inside API container
    echo "    [1/8] Running setup-full..."
    docker exec ${CONTAINER_PREFIX}-api node apps/api/dist/scripts/setup-full.js

    echo "    [2/8] Seeding languages..."
    docker exec ${CONTAINER_PREFIX}-api node apps/api/dist/scripts/seed-languages.js 2>/dev/null || echo "    (skipped or already exists)"

    echo "    [3/8] Seeding seat statuses..."
    docker exec ${CONTAINER_PREFIX}-api node apps/api/dist/scripts/seed-seat-status.js 2>/dev/null || echo "    (skipped or already exists)"

    echo "    [4/8] Seeding rooms and seats..."
    docker exec ${CONTAINER_PREFIX}-api node apps/api/dist/scripts/seed-room.js 2>/dev/null || echo "    (skipped or already exists)"

    echo "    [5/8] Seeding products..."
    docker exec ${CONTAINER_PREFIX}-api node apps/api/dist/scripts/seed-products.js 2>/dev/null || echo "    (skipped or already exists)"

    echo "    [6/8] Seeding POS lookups..."
    docker exec ${CONTAINER_PREFIX}-api node apps/api/dist/scripts/seed-pos.js 2>/dev/null || echo "    (skipped or already exists)"

    echo "    [7/8] Seeding sales lookups..."
    docker exec ${CONTAINER_PREFIX}-api node apps/api/dist/scripts/seed-sales-lookups.js 2>/dev/null || echo "    (skipped or already exists)"

    echo "    [8/8] Seeding showtimes..."
    docker exec ${CONTAINER_PREFIX}-api node apps/api/dist/scripts/seed-showtimes.js 2>/dev/null || echo "    (skipped or already exists)"

    echo ""
    echo "    Creating better-auth admin user..."
    docker exec -e BETTER_AUTH_SECRET -e BETTER_AUTH_URL ${CONTAINER_PREFIX}-api node apps/api/dist/scripts/create-betterauth-admin.js 2>/dev/null || echo "    (may already exist)"

    echo "    Seed complete!"
fi

SEED
fi

# 7. Final status check
echo ""
echo ">>> [7/7] Final status check..."

ssh ${SSH_OPTS} ${SSH_USER}@${VPS_IP} bash -s <<STATUS
set -e
cd ${REMOTE_DIR}

echo ""
echo "    ============================================="
echo "    DEPLOY COMPLETE!"
echo "    ============================================="
echo ""
echo "    Services:"
docker compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE_NAME} ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || docker compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE_NAME} ps
echo ""
echo "    URLs:"
echo "      Web (tenant routing):  https://lawtrel.dev"
echo "      Admin Panel:           https://lawtrel.dev/admin"
echo "      Landing Page:          https://lawtrel.dev/app"
echo "      API:                   https://lawtrel.dev/api"
echo "      API Docs:              https://lawtrel.dev/openapi"
echo "      MinIO Console:         https://lawtrel.dev/minio"
echo ""
echo "    Admin Login:"
echo "      Email:    admin@lawtrel.com"
echo "      Password: Admin@2026"
echo ""
echo "    Useful commands:"
echo "      View logs:  ssh ${VPS_USER}@${VPS_IP} 'cd ${REMOTE_DIR} && docker compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE_NAME} logs -f'"
echo "      Restart:    ssh ${VPS_USER}@${VPS_IP} 'cd ${REMOTE_DIR} && docker compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE_NAME} restart'"
echo "      Stop:       ssh ${VPS_USER}@${VPS_IP} 'cd ${REMOTE_DIR} && docker compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE_NAME} down'"
echo ""

STATUS
