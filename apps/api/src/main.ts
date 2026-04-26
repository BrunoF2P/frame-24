import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import { apiReference } from '@scalar/nestjs-api-reference';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import helmet from 'helmet';
import compression from 'compression';
import express from 'express';
import { toNodeHandler } from 'better-auth/node';
import { AppModule } from './app.module';
import { getAllTags, TAG_GROUPS } from './swagger.config';
import { Logger, VersioningType } from '@nestjs/common';
import { validateEnvironment } from './config/validate-env';
import { PublicModule } from './modules/public/public.module';
import { CrmModule } from './modules/crm/crm.module';
import { RedisIoAdapter } from './common/redis/redis-io.adapter';
import { RedisService } from './common/redis/redis.service';
import { auth } from './lib/auth';
import { createBetterAuthPostThrottle } from './common/middleware/better-auth-post-throttle.middleware';
import {
  isAllowedTenantOrigin,
  normalizeOrigin,
} from './common/utils/tenant-host.util';

const HTTP_METHODS = new Set([
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'options',
  'head',
  'trace',
]);

function pruneDocumentByUsedTags(
  document: Record<string, unknown>,
): Record<string, unknown> {
  const filteredDocument = structuredClone(document);
  const paths = (filteredDocument.paths as Record<string, unknown>) ?? {};
  const usedTags = new Set<string>();

  for (const pathItem of Object.values(paths)) {
    const operations = (pathItem as Record<string, unknown>) ?? {};
    for (const [method, operation] of Object.entries(operations)) {
      if (!HTTP_METHODS.has(method.toLowerCase())) {
        continue;
      }

      const operationTags = ((operation as Record<string, unknown>).tags ??
        []) as string[];
      operationTags.forEach((tag) => usedTags.add(tag));
    }
  }

  const swaggerTags = ((filteredDocument.tags as unknown[]) ?? []) as Array<{
    name?: string;
  }>;
  filteredDocument.tags = swaggerTags.filter((tag) =>
    tag.name ? usedTags.has(tag.name) : false,
  );

  const rawTagGroups =
    (filteredDocument['x-tagGroups'] as
      | Array<{ name: string; description: string; tags: string[] }>
      | undefined) ?? [];

  filteredDocument['x-tagGroups'] = rawTagGroups
    .map((group) => ({
      ...group,
      tags: group.tags.filter((tag) => usedTags.has(tag)),
    }))
    .filter((group) => group.tags.length > 0);

  return filteredDocument;
}

function buildCompanyDocument(
  fullDocument: Record<string, unknown>,
  customerDocument: Record<string, unknown>,
): Record<string, unknown> {
  const companyDocument = structuredClone(fullDocument);
  const companyPaths = (companyDocument.paths as Record<string, unknown>) ?? {};
  const customerPaths =
    (customerDocument.paths as Record<string, unknown>) ?? {};

  for (const [path, customerPathItem] of Object.entries(customerPaths)) {
    const companyPathItem = companyPaths[path] as
      | Record<string, unknown>
      | undefined;
    if (!companyPathItem) {
      continue;
    }

    const customerOperations =
      (customerPathItem as Record<string, unknown>) ?? {};
    for (const method of Object.keys(customerOperations)) {
      if (!HTTP_METHODS.has(method.toLowerCase())) {
        continue;
      }
      delete companyPathItem[method];
    }

    const remainingMethods = Object.keys(companyPathItem).filter((method) =>
      HTTP_METHODS.has(method.toLowerCase()),
    );

    if (remainingMethods.length === 0) {
      delete companyPaths[path];
    }
  }

  companyDocument.paths = companyPaths;

  return pruneDocumentByUsedTags(companyDocument);
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  validateEnvironment();
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  const expressApp = app.getHttpAdapter().getInstance();
  const trustProxyEnv = process.env.TRUST_PROXY?.trim();
  const trustProxyHops =
    trustProxyEnv !== undefined && trustProxyEnv !== ''
      ? Number(trustProxyEnv)
      : process.env.NODE_ENV === 'production'
        ? 1
        : 0;
  if (Number.isFinite(trustProxyHops) && trustProxyHops >= 0) {
    expressApp.set('trust proxy', trustProxyHops);
  }

  const redisIoAdapter = new RedisIoAdapter(app, app.get(RedisService));
  try {
    await redisIoAdapter.connectToRedis();
    logger.log('Socket.IO Redis adapter enabled.');
  } catch (error) {
    logger.warn(
      `Socket.IO Redis adapter unavailable, falling back to local adapter: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  app.useWebSocketAdapter(redisIoAdapter);

  // Garante um request id único por requisição e propaga no response header.
  app.use((req: Request, res: Response, next: () => void) => {
    const incomingRequestId =
      req.headers['x-request-id']?.toString() ??
      req.headers['x-correlation-id']?.toString();

    const requestId =
      incomingRequestId && incomingRequestId.trim().length > 0
        ? incomingRequestId.trim()
        : randomUUID();

    req.headers['x-request-id'] = requestId;
    res.locals.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  });

  // Enable compression
  app.use(compression());

  // Security: HTTP headers protection
  // CSP desabilitado apenas em dev para Swagger/Scalar funcionar
  const isDev = process.env.NODE_ENV !== 'production';
  app.use(
    helmet({
      contentSecurityPolicy: isDev ? false : undefined,
      crossOriginEmbedderPolicy: isDev ? false : undefined,
    }),
  );

  // Configuração de CORS segura
  const frontendUrls = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((url) => url.trim())
    : [];

  const devOrigins = isDev
    ? [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3002',
        'http://127.0.0.1:3002',
        'http://localhost:3004',
        'http://127.0.0.1:3004',
        'http://localhost:4000',
        'http://127.0.0.1:4000',
      ]
    : [];

  const allowedOrigins = [...devOrigins, ...frontendUrls]
    .map(normalizeOrigin)
    .filter(Boolean);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Permite requisições sem origin (Postman, mobile apps, server-to-server)
      if (!origin) return callback(null, true);

      const normalizedOrigin = normalizeOrigin(origin);
      if (
        allowedOrigins.includes(normalizedOrigin) ||
        isAllowedTenantOrigin(origin)
      ) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'User-Agent',
      'Authorization',
      'x-customer-id',
      'x-company-id',
      'x-tenant-slug',
      'x-request-id',
      'x-correlation-id',
      'idempotency-key',
    ],
  });

  app.use('/favicon.ico', (req: Request, res: Response) =>
    res.status(204).end(),
  );

  const authHandler = toNodeHandler(auth);
  const redisService = app.get(RedisService);
  app.use('/api/auth', createBetterAuthPostThrottle(redisService));
  app.use('/api/auth', authHandler);
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.useGlobalPipes(new ZodValidationPipe());

  app.enableVersioning({
    type: VersioningType.URI,
  });

  if (isDev) {
    const configBuilder = new DocumentBuilder()
      .setTitle('Frame24 API')
      .setDescription(
        'API completa para gestão de cinemas multi-tenant com controle de usuários, permissões, vendas e operações. ' +
          'Respostas `429` indicam throttling (Redis) em rotas decoradas ou em POST `/api/auth`. ' +
          'Filtros por `cinema_complex_id` e correlatos são validados contra o tenant autenticado; violações retornam `403`. ' +
          'Em produção o Express usa `trust proxy` (1 hop) para `req.ip` correto atrás de load balancer; ajuste com `TRUST_PROXY` se necessário.',
      )
      .setVersion('1.0.0')
      .setContact(
        'Frame24 Team',
        'https://frame24.com.br',
        'contato@frame24.com.br',
      )
      .addServer('http://localhost:4000', 'Desenvolvimento')
      .addServer('https://api.frame24.com.br', 'Produção');

    if (
      process.env.API_URL &&
      process.env.API_URL !== 'http://localhost:4000' &&
      process.env.API_URL !== 'https://api.frame24.com.br'
    ) {
      configBuilder.addServer(process.env.API_URL, 'Ambiente Atual');
    }

    configBuilder.addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Access token JWT enviado no header Authorization.',
      },
      'access-token',
    );

    getAllTags().forEach((tag) => configBuilder.addTag(tag));

    const config = configBuilder.build();

    // @ts-expect-error - Swagger config doesn't have x-tagGroups in types but it's valid
    config['x-tagGroups'] = TAG_GROUPS;

    const fullDocument = SwaggerModule.createDocument(
      app,
      config,
    ) as unknown as Record<string, unknown>;

    const customerDocument = pruneDocumentByUsedTags(
      SwaggerModule.createDocument(app, config, {
        include: [PublicModule, CrmModule],
      }) as unknown as Record<string, unknown>,
    );

    const companyDocument = buildCompanyDocument(fullDocument, customerDocument);

    app
      .getHttpAdapter()
      .get('/api/openapi.json', (req: Request, res: Response) => {
        res.json(companyDocument);
      });

    app
      .getHttpAdapter()
      .get('/api/openapi-company.json', (req: Request, res: Response) => {
        res.json(companyDocument);
      });

    app
      .getHttpAdapter()
      .get('/api/openapi-customer.json', (req: Request, res: Response) => {
        res.json(customerDocument);
      });

    app.use(
      '/api/docs/company',
      apiReference({
        content: companyDocument,
        theme: 'purple',
        layout: 'modern',
        darkMode: true,
        showSidebar: true,
        customCss: `
        .scalar-api-client__header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
      `,
      }),
    );

    app.use(
      '/api/docs/customer',
      apiReference({
        content: customerDocument,
        theme: 'purple',
        layout: 'modern',
        darkMode: true,
        showSidebar: true,
        customCss: `
        .scalar-api-client__header {
          background: linear-gradient(135deg, #22c55e 0%, #0ea5e9 100%);
        }
      `,
      }),
    );

    app.use(
      '/api/docs',
      apiReference({
        content: companyDocument,
        theme: 'purple',
        layout: 'modern',
        darkMode: true,
        showSidebar: true,
        customCss: `
        .scalar-api-client__header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
      `,
      }),
    );
  } else {
    logger.log('OpenAPI / Scalar desativados (NODE_ENV=production).');
  }

  const port = process.env.PORT || 4000;
  await app.listen(port);

  console.log('\nFrame24 API iniciada com sucesso!\n');
  if (isDev) {
    console.log(`Documentação Empresa:  http://localhost:${port}/api/docs`);
    console.log(
      `Documentação Empresa:  http://localhost:${port}/api/docs/company`,
    );
    console.log(
      `Documentação Cliente:  http://localhost:${port}/api/docs/customer`,
    );
    console.log(
      `OpenAPI Empresa:       http://localhost:${port}/api/openapi.json`,
    );
    console.log(
      `OpenAPI Empresa:       http://localhost:${port}/api/openapi-company.json`,
    );
    console.log(
      `OpenAPI Cliente:       http://localhost:${port}/api/openapi-customer.json`,
    );
  }
  console.log(`API Base:              http://localhost:${port}\n`);
}

void bootstrap();
