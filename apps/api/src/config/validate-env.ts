import { assertNotInsecure, requireEnv } from './env.util';

export function validateEnvironment(): void {
  const authProvider = process.env.AUTH_PROVIDER ?? 'legacy';
  const oidcIssuer = process.env.OIDC_ISSUER ?? process.env.KEYCLOAK_ISSUER;
  const oidcAudience =
    process.env.OIDC_API_AUDIENCE ?? process.env.KEYCLOAK_API_AUDIENCE;
  const provisioningEnabled =
    (
      process.env.AUTHENTIK_PROVISIONING_ENABLED ??
      process.env.KEYCLOAK_PROVISIONING_ENABLED ??
      'false'
    ).toLowerCase() === 'true';

  const jwtSecret = requireEnv('JWT_SECRET', 'test-jwt-secret');
  assertNotInsecure('JWT_SECRET', jwtSecret, [
    'dev_secret',
    'frame24-super-secret-jwt-key-2024',
    'changeme',
    'secret',
    '123456',
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

  if (
    authProvider === 'keycloak' ||
    authProvider === 'authentik' ||
    authProvider === 'oidc' ||
    authProvider === 'hybrid'
  ) {
    if (!oidcIssuer) {
      requireEnv('OIDC_ISSUER', 'http://localhost:9080/application/o/frame24-app/');
    }

    if (!oidcAudience) {
      requireEnv('OIDC_API_AUDIENCE', 'frame24-app');
    }
  }

  if (provisioningEnabled) {
    requireEnv('AUTHENTIK_URL', 'http://localhost:9080');
    requireEnv('AUTHENTIK_TOKEN');
  }
}
