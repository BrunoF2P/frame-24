import type { NextFunction, Request, Response } from 'express';
import type { RedisService } from '../redis/redis.service';

/** Usa `req.ip` (respeita `trust proxy` no Express quando configurado no bootstrap). */
function getRateLimitClientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/** Alinhado ao limite `auth` do Throttler Nest (POST em `/api/auth`). */
const WINDOW_MS = 60_000;
const LIMIT = process.env.NODE_ENV === 'production' ? 10 : 500;
const REDIS_KEY_PREFIX = 'throttle:better-auth-post:';

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function pruneBuckets(now: number): void {
  if (buckets.size < 5000) {
    return;
  }
  for (const [k, b] of buckets) {
    if (now > b.resetAt + WINDOW_MS) {
      buckets.delete(k);
    }
  }
}

function respondRateLimited(res: Response, retryAfterSeconds: number): void {
  res.setHeader('Retry-After', String(Math.max(1, retryAfterSeconds)));
  res.status(429).json({
    statusCode: 429,
    message:
      'Muitas requisições de autenticação. Tente novamente em instantes.',
  });
}

function memoryThrottle(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const now = Date.now();
  pruneBuckets(now);
  const ip = getRateLimitClientIp(req);
  let b = buckets.get(ip);
  if (!b || now > b.resetAt) {
    b = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(ip, b);
  }
  b.count += 1;
  if (b.count > LIMIT) {
    respondRateLimited(
      res,
      Math.max(1, Math.ceil((b.resetAt - now) / 1000)),
    );
    return;
  }
  next();
}

/**
 * Limite distribuído (Redis) com fallback em memória se Redis falhar.
 */
export function createBetterAuthPostThrottle(
  redis: RedisService | null,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    if (req.method !== 'POST') {
      next();
      return;
    }
    if (!redis) {
      memoryThrottle(req, res, next);
      return;
    }

    void (async () => {
      try {
        await redis.ensureConnection();
        const client = redis.getClient();
        const ip = getRateLimitClientIp(req);
        const key = `${REDIS_KEY_PREFIX}${ip}`;
        const n = await client.incr(key);
        if (n === 1) {
          await client.pexpire(key, WINDOW_MS);
        }
        const pttl = await client.pttl(key);
        const ttlMs = pttl > 0 ? pttl : WINDOW_MS;
        if (n > LIMIT) {
          respondRateLimited(res, Math.max(1, Math.ceil(ttlMs / 1000)));
          return;
        }
        next();
      } catch {
        memoryThrottle(req, res, next);
      }
    })();
  };
}
