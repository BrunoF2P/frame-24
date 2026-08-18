import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

interface RedisHealthSnapshot {
  status: string;
  isReady: boolean;
  lastSuccessfulPingAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private lastSuccessfulPingAt: Date | null = null;
  private lastErrorAt: Date | null = null;
  private lastErrorMessage: string | null = null;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
    this.redis.on('connect', () => {
      this.logger.log('Redis client connected.');
    });

    this.redis.on('error', (error: Error) => {
      this.lastErrorAt = new Date();
      this.lastErrorMessage = error.message;
      this.logger.warn(`Redis client error: ${error.message}`);
    });

    this.redis.on('close', () => {
      this.logger.warn('Redis client connection closed.');
    });
  }

  async ensureConnection(): Promise<void> {
    if (this.redis.status === 'ready' || this.redis.status === 'connecting') {
      return;
    }

    await this.redis.connect();
  }

  getClient(): Redis {
    return this.redis;
  }

  async get(key: string): Promise<string | null> {
    await this.ensureConnection();
    return this.redis.get(key);
  }

  async set(
    key: string,
    value: string,
    ttlSeconds?: number,
  ): Promise<'OK' | null> {
    await this.ensureConnection();

    if (ttlSeconds && ttlSeconds > 0) {
      return this.redis.set(key, value, 'EX', ttlSeconds);
    }

    return this.redis.set(key, value);
  }

  async del(key: string): Promise<number> {
    await this.ensureConnection();
    return this.redis.del(key);
  }

  async ping(): Promise<boolean> {
    try {
      await this.ensureConnection();
      const result = await this.redis.ping();

      if (result === 'PONG') {
        this.lastSuccessfulPingAt = new Date();
        return true;
      }

      this.lastErrorAt = new Date();
      this.lastErrorMessage = `Unexpected Redis ping response: ${String(result)}`;
      return false;
    } catch (error) {
      this.lastErrorAt = new Date();
      this.lastErrorMessage =
        error instanceof Error ? error.message : String(error);
      return false;
    }
  }

  getHealthSnapshot(): RedisHealthSnapshot {
    const isReady = this.redis.status === 'ready';

    return {
      status: this.redis.status,
      isReady,
      lastSuccessfulPingAt: this.lastSuccessfulPingAt?.toISOString() ?? null,
      lastErrorAt: this.lastErrorAt?.toISOString() ?? null,
      lastErrorMessage: this.lastErrorMessage,
    };
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis.status !== 'end') {
      await this.redis.quit();
    }
  }
}
