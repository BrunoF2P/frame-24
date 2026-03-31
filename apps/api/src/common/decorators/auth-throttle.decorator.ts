import { Throttle, SkipThrottle as NestSkipThrottle } from '@nestjs/throttler';

export const AuthThrottle = () => Throttle({ auth: { ttl: 60000, limit: 10 } });
export const PublicReadThrottle = () =>
  Throttle({ public: { ttl: 60000, limit: 300 } });
export const WriteThrottle = () =>
  Throttle({ write: { ttl: 60000, limit: 30 } });

// Re-export the official SkipThrottle from @nestjs/throttler
export const SkipThrottle = NestSkipThrottle;
