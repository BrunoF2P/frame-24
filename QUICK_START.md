# 🚀 Guia Rápido - Frame-24 Frontend

## ⚡ Início Rápido (5 minutos)

### 1. Pré-requisitos

- Node.js >= 18
- pnpm 10.20.0
- Podman 5+

### 2. Clonar e Instalar

```bash
# Já clonado, apenas instalar dependências
cd frame-24
pnpm install
```

### 3. Configurar Ambiente

```bash
# Copiar exemplos por app/package (recomendado no Turborepo)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/admin/.env.example apps/admin/.env
cp apps/landing-page/.env.example apps/landing-page/.env
cp packages/db/.env.example packages/db/.env

# Opcional: overrides locais (não versionado)
touch apps/web/.env.local
touch apps/admin/.env.local
```

### 4. Iniciar Infraestrutura

```bash
# Iniciar infraestrutura local (PostgreSQL, RabbitMQ, MinIO e Authentik com bootstrap automatico)
podman compose -f docker-compose.yaml up -d

# Aguardar serviços ficarem prontos
podman compose -f docker-compose.yaml ps
```

### 4.1 Bootstrap do Authentik (automatico)

O compose agora sobe o Authentik e roda automaticamente o container `authentik-bootstrap`,
que cria/atualiza o provider OIDC compartilhado `frame24-app` para `web`, `admin` e `landing`.

Se voce estiver vindo de um ambiente antigo com Keycloak, execute:

```bash
podman compose -f docker-compose.yaml down
podman volume rm frame-24_keycloak_data frame-24_authentik_data frame-24_authentik_postgres_data || true
podman compose -f docker-compose.yaml up -d
```

Endpoints uteis:

- Authentik: <http://localhost:9080/if/admin/> (admin@frame24.local / admin)
- Issuer OIDC compartilhado: <http://localhost:9080/application/o/frame24-app/>
- Token de bootstrap/provisioning local: `frame24-authentik-bootstrap-token`

### 5. Configurar Banco de Dados

```bash
cd packages/db
pnpm db:generate
pnpm db:migrate:dev
pnpm build
cd ../..
```

### 6. Iniciar Aplicação

**Terminal 1 - Backend:**

```bash
pnpm dev:api
# API rodando em http://localhost:4000
```

Contrato de autenticação (padrão do projeto):

- Login canônico: OIDC/Authentik (frontend web/admin/landing via Auth.js).
- A API valida access token RS256 emitido pelo Authentik (issuer/JWKS).
- `POST /v1/auth/register` e `POST /v1/customer/auth/register` fazem provisioning de usuários no Authentik.
- `POST /v1/customer/auth/login` permanece apenas por compatibilidade e retorna 401 (fluxo legado desativado).

Para o fluxo de autenticacao OIDC/Authentik, confira em `apps/api/.env`:

```env
AUTH_PROVIDER=authentik
OIDC_ISSUER=http://localhost:9080/application/o/frame24-app/
OIDC_JWKS_URI=http://localhost:9080/application/o/frame24-app/jwks/
OIDC_API_AUDIENCE=frame24-app
AUTHENTIK_URL=http://localhost:9080
AUTHENTIK_TOKEN=frame24-authentik-bootstrap-token
AUTHENTIK_PROVISIONING_ENABLED=true
```

**Terminal 2 - Frontend:**

```bash
pnpm dev:web
# Frontend rodando em http://localhost:3000
```

### 7. Acessar Sistema

- **Frontend:** <http://localhost:3000>
- **API Docs:** <http://localhost:4000/api/docs>
- **Dashboard:** <http://localhost:3000/dashboard>

## 📱 Módulos Disponíveis

| Módulo          | URL                 | Descrição                |
| --------------- | ------------------- | ------------------------ |
| 🏠 Dashboard    | `/dashboard`        | Métricas e ações rápidas |
| 🔐 Login        | `/:tenant_slug/auth/login` | Login OIDC (Authentik) |
| 👥 Usuários     | `/users`            | Gestão de usuários       |
| 🎬 Filmes       | `/movies`           | Catálogo de filmes       |
| 📦 Produtos     | `/products`         | Gestão de produtos       |
| 🏢 Complexos    | `/cinema-complexes` | Complexos de cinema      |
| 🚪 Salas        | `/rooms`            | Salas de cinema          |
| 📅 Sessões      | `/showtimes`        | Programação              |
| 🚚 Fornecedores | `/suppliers`        | Gestão de fornecedores   |
| 🏷️ Categorias   | `/movie-categories` | Categorias de filmes     |

## 🔑 Credenciais de Teste

Para criar um usuário/empresa de teste, use a landing page ou a API diretamente:

```bash
# Registrar nova empresa (provisiona admin no Keycloak)
curl -X POST http://localhost:4000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "corporate_name": "Cinema Teste LTDA",
    "trade_name": "Cinema Teste",
    "cnpj": "12345678000195",
    "full_name": "Admin Teste",
    "email": "admin@teste.com",
    "password": "SenhaForte123"
  }'
```

Ou acesse: <http://localhost:3003> (Landing Page) para registro.

## 🐛 Problemas Comuns

### Erro: "Cannot connect to API"

```bash
# Verificar se backend está rodando
curl http://localhost:4000/api/docs

# Se não responder, reiniciar backend
pnpm dev:api
```

### Erro: "Database connection failed"

```bash
# Verificar containers
podman compose -f docker-compose.yaml ps

# Reiniciar se necessário
podman compose -f docker-compose.yaml restart postgres
```

### Erro: "Port 3000 already in use"

```bash
# Matar processo na porta 3000
lsof -ti:3000 | xargs kill -9

# Ou usar porta diferente
PORT=3001 pnpm dev:web
```

## 📚 Documentação Completa

- [FRONTEND_DEVELOPMENT.md](./FRONTEND_DEVELOPMENT.md) - Documentação completa
- [API_ENDPOINTS.md](./API_ENDPOINTS.md) - Endpoints disponíveis
- [FRONTEND_FILES_SUMMARY.md](./FRONTEND_FILES_SUMMARY.md) - Arquivos criados
- [README.md](./README.md) - Documentação do projeto

## 🎯 Próximos Passos

1. ✅ Explorar o dashboard
2. ✅ Testar módulos de listagem
3. 🔜 Implementar páginas de criação/edição
4. 🔜 Adicionar upload de imagens
5. 🔜 Implementar sistema de vendas

## 💡 Dicas

- Use **Ctrl + Shift + I** para abrir DevTools
- Token JWT expira em 7 dias (configurável)
- Dark mode disponível no canto superior direito
- Todas as listagens têm busca integrada

## 🆘 Suporte

Se encontrar problemas:

1. Verifique a documentação completa
2. Consulte os logs do backend e frontend
3. Verifique se todos os serviços do Podman estão rodando
4. Limpe cache do navegador se necessário

---

**Desenvolvido para o projeto Frame-24** 🎬
