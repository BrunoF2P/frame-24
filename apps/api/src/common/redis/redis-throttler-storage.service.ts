import { Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { RedisService } from './redis.service';

interface RedisThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

@Injectable()
export class RedisThrottlerStorageService implements ThrottlerStorage {
  constructor(private readonly redisService: RedisService) {}

  private getHitsKey(throttlerName: string, key: string) {
    return `throttle:${throttlerName}:${key}`;
  }

  private getBlockKey(throttlerName: string, key: string) {
    return `throttle:block:${throttlerName}:${key}`;
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<RedisThrottlerStorageRecord> {
    const redis = this.redisService.getClient();
    await this.redisService.ensureConnection();

    const hitsKey = this.getHitsKey(throttlerName, key);
    const blockKey = this.getBlockKey(throttlerName, key);

    const ttlMs = Math.max(1, ttl);
    const blockDurationMs = Math.max(0, blockDuration);

    const script = `
      local hitsKey = KEYS[1]
      local blockKey = KEYS[2]
      local ttlMs = tonumber(ARGV[1])
      local limit = tonumber(ARGV[2])
      local blockDurationMs = tonumber(ARGV[3])

      local totalHits = redis.call("INCR", hitsKey)
      if totalHits == 1 then
        redis.call("PEXPIRE", hitsKey, ttlMs)
      end

      local timeToExpire = redis.call("PTTL", hitsKey)
      if timeToExpire < 0 then
        timeToExpire = ttlMs
        redis.call("PEXPIRE", hitsKey, ttlMs)
      end

      local isBlocked = 0
      local timeToBlockExpire = redis.call("PTTL", blockKey)

      if timeToBlockExpire > 0 then
        isBlocked = 1
      elseif totalHits > limit then
        isBlocked = 1
        if blockDurationMs > 0 then
          redis.call("SET", blockKey, "1", "PX", blockDurationMs)
          timeToBlockExpire = blockDurationMs
        else
          timeToBlockExpire = timeToExpire
        end
      elseif timeToBlockExpire < 0 then
        timeToBlockExpire = 0
      end

      return {totalHits, timeToExpire, isBlocked, timeToBlockExpire}
    `;

    const result = (await redis.eval(
      script,
      2,
      hitsKey,
      blockKey,
      ttlMs.toString(),
      limit.toString(),
      blockDurationMs.toString(),
    )) as [number, number, number, number];

    return {
      totalHits: result[0] ?? 0,
      timeToExpire: result[1] ?? 0,
      isBlocked: result[2] === 1,
      timeToBlockExpire: result[3] ?? 0,
    };
  }
}
