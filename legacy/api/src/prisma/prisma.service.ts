import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  INestApplication,
} from '@nestjs/common';
import { PrismaClient, getPrismaClientOptions } from '@repo/db';
import { ClsService } from 'nestjs-cls';
import { tenancyExtension } from './prisma-tenancy.extension';
import { softDeleteExtension } from './prisma-soft-delete.extension';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { snowflakeIdExtension } from './prisma-snowflake.extension';

const isDev = process.env.NODE_ENV !== 'production';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private _extendedClient: Record<PropertyKey, unknown> | null = null;
  private readonly logger = new Logger(PrismaService.name);

  constructor(
    private readonly cls: ClsService,
    private readonly snowflake: SnowflakeService,
  ) {
    super({
      ...getPrismaClientOptions(),
      log: isDev
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'error' },
          ]
        : [{ emit: 'stdout', level: 'error' }],
    });

    if (isDev) {
      // Log slow queries (>200ms) as warnings in development
      (
        this as PrismaClient & {
          $on: (
            event: string,
            cb: (e: { duration: number; query: string }) => void,
          ) => void;
        }
      ).$on('query', (e: { duration: number; query: string }) => {
        if (e.duration > 200) {
          this.logger.warn(
            `SLOW QUERY (${e.duration}ms): ${e.query.substring(0, 300)}`,
          );
        }
      });
    }

    return new Proxy(this, {
      get: (target, prop, receiver) => {
        if (this._extendedClient && prop in this._extendedClient) {
          return this._extendedClient[prop];
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this._extendedClient = this.$extends(tenancyExtension(this.cls))
      .$extends(softDeleteExtension())
      .$extends(snowflakeIdExtension(this.snowflake)) as Record<
      PropertyKey,
      unknown
    >;
    this.logger.log(
      'Prisma client connected with tenancy + soft-delete + snowflake extensions.',
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  enableShutdownHooks(app: INestApplication): void {
    process.on('SIGTERM', () => {
      void (async () => {
        await this.$disconnect();
        await app.close();
      })();
    });
  }
}
