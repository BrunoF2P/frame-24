FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/db/package.json ./packages/db/package.json

RUN pnpm install --frozen-lockfile --filter api... --filter @repo/db...

COPY apps/api ./apps/api
COPY packages/db ./packages/db
COPY scripts/docker/api-entrypoint.sh ./scripts/docker/api-entrypoint.sh

ENV DIRECT_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

RUN pnpm --filter @repo/db run build
RUN pnpm --filter api run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

ENV DIRECT_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

RUN apk add --no-cache dumb-init openssl \
	&& apk upgrade --no-cache zlib \
	&& corepack enable \
	&& corepack prepare pnpm@10.33.0 --activate

COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/pnpm-lock.yaml /app/pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY --from=builder /app/apps/api/package.json /app/apps/api/package.json
COPY --from=builder /app/packages/db/package.json /app/packages/db/package.json

COPY --from=builder /app/packages/db/prisma /app/packages/db/prisma
COPY --from=builder /app/packages/db/prisma.config.ts /app/packages/db/prisma.config.ts

RUN pnpm install --frozen-lockfile --filter api... --filter @repo/db...

RUN pnpm --filter @repo/db run db:generate

RUN rm -rf /root/.cache/node/corepack \
	&& rm -rf /usr/local/lib/node_modules/npm \
	&& rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/pnpm /usr/local/bin/pnpx

COPY --from=builder /app/apps/api/dist /apps/api/dist
COPY --from=builder /app/apps/api/path-alias-register.js /apps/api/path-alias-register.js
COPY --from=builder /app/apps/api/tsconfig.json /apps/api/tsconfig.json
COPY --from=builder /app/packages/db/dist /apps/api/dist
COPY --from=builder /app/scripts/docker/api-entrypoint.sh /app/scripts/docker/api-entrypoint.sh

RUN chmod +x /app/scripts/docker/api-entrypoint.sh

USER node

EXPOSE 4000

ENTRYPOINT ["dumb-init", "/app/scripts/docker/api-entrypoint.sh"]
