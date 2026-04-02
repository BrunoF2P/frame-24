import { ThrottlerModuleOptions, ThrottlerStorage } from '@nestjs/throttler';

const throttlers = [
  {
    name: 'default',
    ttl: 60000, // 60 seconds
    limit: 100, // 100 requests per minute
  },
  {
    name: 'auth',
    ttl: 60000, // 60 seconds
    limit: 10, // 10 requests per minute for auth endpoints
  },
  {
    name: 'public',
    ttl: 60000, // 60 seconds
    limit: 300, // higher read throughput for storefront browsing
  },
  {
    name: 'write',
    ttl: 60000, // 60 seconds
    limit: 30, // strict mutation budget per minute
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
  throttlers: [
    ...throttlers,
  ],
};
