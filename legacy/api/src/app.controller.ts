import {
  Controller,
  Get,
  Redirect,
  ServiceUnavailableException,
} from '@nestjs/common';
import { RedisService } from './common/redis/redis.service';

@Controller()
export class AppController {
  constructor(private readonly redisService: RedisService) {}

  @Get()
  @Redirect('/api/docs', 302)
  getRoot() {
    // Redireciona para a documentação
    return;
  }

  @Get('health')
  async healthCheck() {
    const redisHealthy = await this.redisService.ping();
    const redis = this.redisService.getHealthSnapshot();
    const status = redisHealthy ? 'ok' : 'degraded';

    return {
      status,
      timestamp: new Date().toISOString(),
      service: 'Frame24 API',
      version: '1.0.0',
      dependencies: {
        redis: {
          healthy: redisHealthy,
          ...redis,
        },
      },
    };
  }

  @Get('health/ready')
  async readinessCheck() {
    const redisHealthy = await this.redisService.ping();

    if (!redisHealthy) {
      throw new ServiceUnavailableException({
        status: 'error',
        timestamp: new Date().toISOString(),
        service: 'Frame24 API',
        readiness: 'not-ready',
        dependencies: {
          redis: {
            healthy: false,
            ...this.redisService.getHealthSnapshot(),
          },
        },
      });
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Frame24 API',
      readiness: 'ready',
      dependencies: {
        redis: {
          healthy: true,
          ...this.redisService.getHealthSnapshot(),
        },
      },
    };
  }
}
