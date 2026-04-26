import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient, getPrismaClientOptions } from '@repo/db';
import { requireEnv } from 'src/config/env.util';
import { validateEnvironment } from 'src/config/validate-env';
import { getTenantBaseDomains } from 'src/common/utils/tenant-host.util';

validateEnvironment();

const prisma = new PrismaClient(getPrismaClientOptions());

const isProduction = process.env.NODE_ENV === 'production';

function resolveBetterAuthSecret(): string {
  const secret = requireEnv(
    'BETTER_AUTH_SECRET',
    'test-better-auth-secret-min-32-characters!!',
  ).trim();

  if (isProduction && secret.length < 32) {
    throw new Error(
      'BETTER_AUTH_SECRET must have at least 32 characters in production.',
    );
  }

  return secret;
}

function resolveBetterAuthBaseURL(): string {
  const baseURL =
    process.env.BETTER_AUTH_URL?.trim() || process.env.API_URL?.trim();

  if (baseURL) {
    return baseURL;
  }

  if (isProduction) {
    throw new Error('BETTER_AUTH_URL or API_URL is required in production.');
  }

  return 'http://localhost:4000';
}

function resolveTrustedOrigins(): string[] {
  const origins = (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  for (const domain of getTenantBaseDomains()) {
    origins.push(`https://*.${domain}`);
    origins.push(`https://${domain}`);
  }

  if (process.env.NODE_ENV !== 'production') {
    origins.push(
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://*.localhost:3000',
      'http://*.lvh.me:3000',
      'http://localhost:3003',
      'http://127.0.0.1:3003',
      'http://localhost:3004',
      'http://127.0.0.1:3004',
    );
  }

  return Array.from(new Set(origins));
}

export const auth = betterAuth({
  appName: 'Frame24',
  secret: resolveBetterAuthSecret(),
  baseURL: resolveBetterAuthBaseURL(),
  trustedOrigins: resolveTrustedOrigins(),
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === 'production',
  },
});
