import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { RedisService } from '../redis/redis.service';

interface RedisCacheEnvelope<T> {
  value: T;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(
    @Optional() @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly redisService: RedisService,
  ) {}

  private getRedisKey(key: string) {
    return `cache:${key}`;
  }

  private normalizeTtlToSeconds(ttl?: number): number | undefined {
    if (!ttl || ttl <= 0) {
      return undefined;
    }

    return Math.max(1, Math.ceil(ttl / 1000));
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const redisValue = await this.redisService.get(this.getRedisKey(key));

      if (redisValue) {
        const parsed = JSON.parse(redisValue) as RedisCacheEnvelope<T>;
        return parsed.value;
      }
    } catch (error) {
      this.logger.warn(
        `Redis cache get failed for key "${key}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return this.cacheManager?.get<T>(key);
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    try {
      await this.redisService.set(
        this.getRedisKey(key),
        JSON.stringify({ value } satisfies RedisCacheEnvelope<unknown>),
        this.normalizeTtlToSeconds(ttl),
      );
    } catch (error) {
      this.logger.warn(
        `Redis cache set failed for key "${key}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (this.cacheManager) {
      await this.cacheManager.set(key, value, ttl);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redisService.del(this.getRedisKey(key));
    } catch (error) {
      this.logger.warn(
        `Redis cache delete failed for key "${key}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    await this.cacheManager?.del(key);
  }

  async wrap<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await fn();
    await this.set(key, value, ttl);
    return value;
  }
}
