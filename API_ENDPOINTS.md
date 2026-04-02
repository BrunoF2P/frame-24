# Mapeamento de Endpoints da API Frame-24

## Autenticação (Identity/Auth)

- POST /v1/auth/register - Registrar nova empresa e provisionar admin no Keycloak

Contrato de autenticação (padrão do projeto):

- Login canônico: OIDC/Keycloak (frontend web/admin/landing via Auth.js).
- A API valida access token RS256 emitido pelo Keycloak (issuer/JWKS).
- `POST /v1/auth/register` e `POST /v1/customer/auth/register` fazem provisioning de usuários no Keycloak.
- `POST /v1/customer/auth/login` permanece apenas por compatibilidade e retorna 401 (fluxo legado desativado).

## Usuários (Identity/Users)

- GET /v1/users - Listar usuários
- GET /v1/users/:id - Buscar usuário
- POST /v1/users - Criar usuário
- PUT /v1/users/:id - Atualizar usuário
- DELETE /v1/users/:id - Deletar usuário
- PUT /v1/users/:id/change-password - Alterar senha

## Roles e Permissões (Identity/Roles)

- GET /v1/roles - Listar roles
- GET /v1/roles/:id - Buscar role
- POST /v1/roles - Criar role
- PUT /v1/roles/:id - Atualizar role
- DELETE /v1/roles/:id - Deletar role
- GET /v1/permissions - Listar permissões

## Filmes (Catalog/Movies)

- GET /v1/movies - Listar filmes
- GET /v1/movies/:id - Buscar filme
- POST /v1/movies - Criar filme
- PUT /v1/movies/:id - Atualizar filme
- DELETE /v1/movies/:id - Deletar filme
- GET /v1/movies/cast-types - Tipos de elenco
- GET /v1/movies/media-types - Tipos de mídia
- GET /v1/movies/age-ratings - Classificações indicativas

## Categorias de Filmes (Catalog/Movie Categories)

- GET /v1/movie-categories - Listar categorias
- GET /v1/movie-categories/:id - Buscar categoria
- POST /v1/movie-categories - Criar categoria
- PUT /v1/movie-categories/:id - Atualizar categoria
- DELETE /v1/movie-categories/:id - Deletar categoria

## Produtos (Catalog/Products)

- GET /v1/products - Listar produtos
- GET /v1/products/:id - Buscar produto
- POST /v1/products - Criar produto
- PUT /v1/products/:id - Atualizar produto
- DELETE /v1/products/:id - Deletar produto

## Categorias de Produtos (Catalog/Product Categories)

- GET /v1/product-categories - Listar categorias
- GET /v1/product-categories/:id - Buscar categoria
- POST /v1/product-categories - Criar categoria
- PUT /v1/product-categories/:id - Atualizar categoria
- DELETE /v1/product-categories/:id - Deletar categoria

## Fornecedores (Inventory/Suppliers)

- GET /v1/suppliers - Listar fornecedores
- GET /v1/suppliers/:id - Buscar fornecedor
- POST /v1/suppliers - Criar fornecedor
- PUT /v1/suppliers/:id - Atualizar fornecedor
- DELETE /v1/suppliers/:id - Deletar fornecedor

## Complexos de Cinema (Operations/Cinema Complexes)

- GET /v1/cinema-complexes - Listar complexos
- GET /v1/cinema-complexes/:id - Buscar complexo
- POST /v1/cinema-complexes - Criar complexo
- PUT /v1/cinema-complexes/:id - Atualizar complexo
- DELETE /v1/cinema-complexes/:id - Deletar complexo

## Salas (Operations/Rooms)

- GET /v1/rooms - Listar salas
- GET /v1/rooms/:id - Buscar sala
- POST /v1/rooms - Criar sala
- PUT /v1/rooms/:id - Atualizar sala
- DELETE /v1/rooms/:id - Deletar sala

## Assentos (Operations/Seats)

- GET /v1/seats - Listar assentos
- GET /v1/seats/:id - Buscar assento
- POST /v1/seats - Criar assento
- PUT /v1/seats/:id - Atualizar assento
- DELETE /v1/seats/:id - Deletar assento

## Sessões (Operations/Showtimes)

- GET /v1/showtimes - Listar sessões
- GET /v1/showtimes/:id - Buscar sessão
- POST /v1/showtimes - Criar sessão
- PUT /v1/showtimes/:id - Atualizar sessão
- DELETE /v1/showtimes/:id - Deletar sessão

## Tipos Auxiliares (Operations)

- GET /v1/audio-types - Tipos de áudio
- GET /v1/projection-types - Tipos de projeção
- GET /v1/session-languages - Idiomas de sessão
- GET /v1/session-status - Status de sessão
- GET /v1/seat-types - Tipos de assento
- GET /v1/seat-status - Status de assento
