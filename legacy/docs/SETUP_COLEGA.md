# Configuração pronta para o colega (VPS 174.138.79.19)

## Arquivos criados:
- `.env.remote` — **JÁ CONFIGURADO com IP 174.138.79.19 e secrets reais da VPS**
- `docker-compose.dev.yml` — **standalone** (não usa prod), sobe só `web` + `api` apontando pra VPS
- `apps/api/dockerfile.dev` — Dockerfile otimizado para dev (cache de layers, builda packages internamente)
- `.env.remote.example` — template documentado

---

## ⚠️ IMPORTANTE: Firewall na VPS

Para o colega conectar direto (Opção B), as portas precisam estar abertas:

```bash
# Na VPS (ssh root@174.138.79.19), rode:
ufw allow 5432/tcp   # PostgreSQL
ufw allow 6379/tcp   # Redis
ufw allow 5672/tcp   # RabbitMQ
ufw allow 9000/tcp   # MinIO API
ufw allow 9001/tcp   # MinIO Console (opcional)
ufw reload
```

**OU** no painel da DigitalOcean: Networking → Firewalls → Add rule → TCP → portas acima → Save.

---

## O que o colega precisa fazer:

```bash
# 1. Clone o repo
git clone <repo-url>
cd frame-24

# 2. O .env.remote JÁ ESTÁ PRONTO com os valores da VPS
#    (se quiser confirmar: cat .env.remote)

# 3. Suba web + api (ARQUIVO ÚNICO - docker-compose.dev.yml)
docker compose -f docker-compose.dev.yml up -d --build web api

# 4. Acesse:
#    Web:  http://localhost:3000
#    API:  http://localhost:4000
```

---

## Se NÃO quiser expor portas no firewall (Opção A - mais seguro):

Use SSH tunnel (não precisa mexer no firewall da VPS):

```bash
# Terminal do colega (mantém aberto):
ssh -L 5432:localhost:5432 -L 6379:localhost:6379 -L 5672:localhost:5672 -L 9000:localhost:9000 root@174.138.79.19 -N
```

E no `.env.remote`, troque `174.138.79.19` por `host.docker.internal`:
- `REMOTE_DATABASE_URL=postgresql://frame24:frame24pass@host.docker.internal:5432/frame24...`
- `REMOTE_REDIS_HOST=host.docker.internal`
- `REMOTE_RABBITMQ_HOST=host.docker.internal`
- `REMOTE_MINIO_ENDPOINT=host.docker.internal`

O `docker-compose.dev.yml` já resolve `host.docker.internal` automaticamente.

---

## Variáveis já preenchidas no .env.remote (valores da VPS /opt/frame24/.env)

| Variável | Valor |
|----------|-------|
| `REMOTE_DATABASE_URL` | `postgresql://frame24:frame24pass@174.138.79.19:5432/frame24...` |
| `REMOTE_REDIS_HOST` | `174.138.79.19` |
| `REMOTE_REDIS_PASSWORD` | `frame24redis` |
| `REMOTE_RABBITMQ_HOST` | `174.138.79.19` |
| `REMOTE_RABBITMQ_PASSWORD` | `frame24pass` |
| `REMOTE_MINIO_ENDPOINT` | `174.138.79.19` |
| `REMOTE_MINIO_PORT` | `9000` |
| `REMOTE_MINIO_ACCESS_KEY` | `frame24-storage-key` |
| `REMOTE_MINIO_SECRET_KEY` | `frame24-storage-secret-2026` |
| `REMOTE_JWT_SECRET` | `frame24-prod-jwt-secret-2026-change-me` |
| `REMOTE_BETTER_AUTH_SECRET` | `frame24-prod-better-auth-secret-2026-change-me` |
| `REMOTE_AUTH_INTERNAL_SECRET` | `frame24-prod-auth-internal-secret-2026` |
| `REMOTE_OIDC_INTERNAL_SECRET` | `change-me-to-a-long-random-secret-at-least-32-chars` |
| `REMOTE_TENANT_BASE_DOMAIN` | `lawtrel.dev` |

---

## Troubleshooting

**Erro de conexão com Postgres/Redis/RabbitMQ:**
- Verifique se o firewall da VPS tem as portas abertas (ufw allow)
- Ou use SSH tunnel (Opção A)

**Erro "host.docker.internal not found":**
- O `docker-compose.override.yml` já tem `extra_hosts: host.docker.internal:host-gateway`
- Funciona no Docker Desktop (Mac/Windows) e Linux com kernel 5.15+

**Build demora muito:**
- O `dockerfile.dev` usa multi-stage com cache de `pnpm install` e `prisma generate`
- Builds subsequentes são rápidos

**Porta 3000/4000 ocupada:**
- Pare o que estiver rodando: `docker compose -f docker-compose.dev.yml down` ou `lsof -ti:3000 | xargs kill`