# Guia para o colega trabalhar só com Web + API localmente

## Opção 1: SSH Tunnel (mais seguro, recomendado)

No terminal do colega, rode **antes** do `docker compose up`:

```bash
# Túnel para PostgreSQL (5432)
ssh -L 5432:localhost:5432 usuario@seu-servidor -N &

# Túnel para Redis (6379)
ssh -L 6379:localhost:6379 usuario@seu-servidor -N &

# Túnel para RabbitMQ (5672 + 15672 management)
ssh -L 5672:localhost:5672 -L 15672:localhost:15672 usuario@seu-servidor -N &

# Túnel para MinIO (9000 + 9001 console)
ssh -L 9000:localhost:9000 -L 9001:localhost:9001 usuario@seu-servidor -N &
```

Depois, no `.env.remote`, use `localhost` para tudo:
```
REMOTE_DATABASE_URL=postgresql://frame24:frame24pass@host.docker.internal:5432/frame24?schema=public&connection_limit=30
REMOTE_REDIS_HOST=host.docker.internal
REMOTE_RABBITMQ_HOST=host.docker.internal
REMOTE_MINIO_ENDPOINT=host.docker.internal
```

> **Nota**: O `docker-compose.override.yml` já tem `extra_hosts: host.docker.internal:host-gateway` para resolver `host.docker.internal` dentro do container.

---

## Opção 2: Portas expostas no servidor (menos seguro)

Se o servidor tiver as portas abertas no firewall/cloud:
- PostgreSQL: 5432
- Redis: 6379
- RabbitMQ: 5672
- MinIO: 9000/9001

No `.env.remote`, coloque o IP público do servidor:
```
REMOTE_DATABASE_URL=postgresql://frame24:frame24pass@123.45.67.89:5432/frame24?schema=public&connection_limit=30
REMOTE_REDIS_HOST=123.45.67.89
REMOTE_RABBITMQ_HOST=123.45.67.89
REMOTE_MINIO_ENDPOINT=123.45.67.89
```

---

## Passos para o colega

```bash
# 1. Clone o repo
git clone <repo-url>
cd frame-24

# 2. Copie o .env.remote.example e preencha
cp .env.remote.example .env.remote
# edite .env.remote com os valores corretos

# 3. (Se usar SSH tunnel) Abra os túneis em terminais separados ou use tmux/screen

# 4. Suba só web + api
docker compose -f docker-compose.yaml -f docker-compose.prod.yml -f docker-compose.override.yml up -d --build web api

# 5. Acesse:
#    Web:  http://localhost:3000
#    API:  http://localhost:4000
```

---

## O que o colega NÃO precisa rodar
- postgres, redis, rabbitmq, minio, mailpit, pgbouncer, nginx, admin, landing-page

---

## Variáveis importantes no .env.remote

| Variável | Descrição |
|----------|-----------|
| `REMOTE_DATABASE_URL` | String de conexão Postgres completa |
| `REMOTE_REDIS_HOST/PORT/PASSWORD` | Redis do servidor |
| `REMOTE_RABBITMQ_HOST/PORT/PASSWORD` | RabbitMQ do servidor |
| `REMOTE_MINIO_ENDPOINT/PORT/ACCESS/SECRET` | MinIO do servidor |
| `REMOTE_JWT_SECRET` | Copie do `.env` do servidor (produção) |
| `REMOTE_BETTER_AUTH_SECRET` | Copie do `.env` do servidor |
| `REMOTE_AUTH_INTERNAL_SECRET` | Copie do `.env` do servidor |
| `REMOTE_OIDC_INTERNAL_SECRET` | Copie do `.env` do servidor (min 32 chars) |
| `REMOTE_TENANT_BASE_DOMAIN` | Ex: `lawtrel.dev` |

---

## Desenvolvimento sem Docker (alternativa)

Se o colega preferir rodar **fora do Docker** (Node direto):

```bash
# Terminal 1: API
cd apps/api
cp ../../.env.remote .env
# Edite .env para usar host.docker.internal -> localhost
pnpm install
pnpm run dev

# Terminal 2: Web
cd apps/web
cp ../../.env.remote .env.local
# Edite .env.local:
# NEXT_PUBLIC_API_URL=http://localhost:4000
# NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
# NEXT_PUBLIC_AUTH_URL=http://localhost:4000
pnpm install
pnpm run dev
```

> Para isso funcionar, os túneis SSH devem mapear para `localhost` (não `host.docker.internal`).