import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type { Server, ServerOptions } from 'socket.io';
import type Redis from 'ioredis';
import { RedisService } from './redis.service';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor?: ReturnType<typeof createAdapter>;
  private subClient?: Redis;

  constructor(
    app: INestApplicationContext,
    private readonly redisService: RedisService,
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const pubClient = this.redisService.getClient();
    await this.redisService.ensureConnection();

    this.subClient = pubClient.duplicate() as unknown as Redis;
    await this.subClient.connect();

    this.adapterConstructor = createAdapter(
      pubClient as unknown as Redis,
      this.subClient,
    );
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options) as Server;

    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }

    return server;
  }

  override async close(server: Server): Promise<void> {
    await super.close(server);

    if (this.subClient && this.subClient.status !== 'end') {
      await this.subClient.quit();
      this.subClient = undefined;
    }
  }
}
