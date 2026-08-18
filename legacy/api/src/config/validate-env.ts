import { assertNotInsecure, isTestEnv, requireEnv } from './env.util';

export function validateEnvironment(): void {
  const jwtSecret = requireEnv('JWT_SECRET', 'test-jwt-secret');
  const betterAuthSecret = requireEnv(
    'BETTER_AUTH_SECRET',
    'change-me-better-auth-secret',
  );
  if (!process.env.BETTER_AUTH_URL && !process.env.API_URL) {
    throw new Error(
      'Missing required environment variable: BETTER_AUTH_URL or API_URL',
    );
  }

  assertNotInsecure('JWT_SECRET', jwtSecret, [
    'dev_secret',
    'frame24-super-secret-jwt-key-2024',
    'changeme',
    'secret',
    '123456',
  ]);
  assertNotInsecure('BETTER_AUTH_SECRET', betterAuthSecret, [
    'changeme',
    'secret',
    '123456',
    'change-me-better-auth-secret',
  ]);

  // RabbitMQ: either full URI or connection parts are required.
  const rabbitUri = process.env.RABBITMQ_URI;
  if (!rabbitUri) {
    requireEnv('RABBITMQ_USER', 'test');
    requireEnv('RABBITMQ_PASSWORD', 'test');
    requireEnv('RABBITMQ_HOST', 'localhost');
    requireEnv('RABBITMQ_PORT', '5672');
  }

  // Storage credentials should never rely on hardcoded defaults.
  const minioAccessKey = requireEnv('MINIO_ACCESS_KEY', 'test');
  const minioSecretKey = requireEnv('MINIO_SECRET_KEY', 'test');
  assertNotInsecure('MINIO_ACCESS_KEY', minioAccessKey, ['minioadmin']);
  assertNotInsecure('MINIO_SECRET_KEY', minioSecretKey, [
    'minioadmin',
    'frame24pass',
  ]);

  if (!process.env.REDIS_URL) {
    requireEnv('REDIS_HOST', 'localhost');
    requireEnv('REDIS_PORT', '6379');
  }

  // Segredo interno (cookies/sessão OIDC e integrações server-to-server). Sem fallback estático.
  const internalSecret =
    process.env.OIDC_INTERNAL_SECRET?.trim() ||
    process.env.AUTH_INTERNAL_SECRET?.trim();
  if (!isTestEnv) {
    if (!internalSecret) {
      throw new Error(
        'Missing required environment variable: OIDC_INTERNAL_SECRET or AUTH_INTERNAL_SECRET',
      );
    }
    const internalLabel = process.env.OIDC_INTERNAL_SECRET?.trim()
      ? 'OIDC_INTERNAL_SECRET'
      : 'AUTH_INTERNAL_SECRET';
    assertNotInsecure(internalLabel, internalSecret, [
      'changeme',
      'secret',
      '123456',
      'change-me-internal-secret',
      'dev-only-internal-secret',
    ]);
    if (process.env.NODE_ENV === 'production' && internalSecret.length < 32) {
      throw new Error(
        `${internalLabel} must have at least 32 characters in production.`,
      );
    }
  }
}
