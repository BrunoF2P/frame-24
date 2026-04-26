import { ThrottlerModuleOptions, ThrottlerStorage } from '@nestjs/throttler';

const isRelaxedEnv = process.env.NODE_ENV !== 'production';

const limitFor = (productionLimit: number, relaxedLimit: number) =>
  isRelaxedEnv ? relaxedLimit : productionLimit;

const throttlers = [
  {
    name: 'default',
    ttl: 60000,
    limit: limitFor(100, 2000),
  },
  {
    name: 'auth',
    ttl: 60000,
    limit: limitFor(10, 500),
  },
  {
    name: 'signup',
    ttl: 60000,
    limit: limitFor(5, 250),
  },
  {
    name: 'customerSignup',
    ttl: 60000,
    limit: limitFor(8, 250),
  },
  {
    name: 'provisioning',
    ttl: 60000,
    limit: limitFor(15, 500),
  },
  {
    name: 'public',
    ttl: 60000,
    limit: limitFor(300, 5000),
  },
  {
    name: 'write',
    ttl: 60000,
    limit: limitFor(30, 500),
  },
] as const;

export function createThrottlerConfig(
  storage: ThrottlerStorage,
): ThrottlerModuleOptions {
  return {
    storage,
    throttlers: [...throttlers],
  };
}

export const throttlerConfig: ThrottlerModuleOptions = {
  throttlers: [...throttlers],
};
