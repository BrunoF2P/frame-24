import { Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { LoggerService } from './services/logger.service';
import { SnowflakeService } from './services/snowflake.service';
import { BrasilApiService } from './services/brasil-api.service';
import { TenantContextService } from './services/tenant-context.service';
import { SlugService } from './services/slug.service';
import { NoopProvisioningService } from './services/noop-provisioning.service';
import { IdentityProvisioningService } from './services/identity-provisioning.service';
import { RabbitMQModule } from 'src/common/rabbitmq/rabbitmq.module';
import { CacheModule } from './cache/cache.module';
import { RedisModule } from './redis/redis.module';
import { RedisThrottlerStorageService } from './redis/redis-throttler-storage.service';
import { TenantResourceService } from './services/tenant-resource.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [
    ClsModule.forFeature(),
    RabbitMQModule,
    CacheModule,
    RedisModule,
    PrismaModule,
  ],
  providers: [
    LoggerService,
    SnowflakeService,
    BrasilApiService,
    TenantContextService,
    TenantResourceService,
    SlugService,
    NoopProvisioningService,
    {
      provide: IdentityProvisioningService,
      useExisting: NoopProvisioningService,
    },
    RedisThrottlerStorageService,
  ],
  exports: [
    RabbitMQModule,
    LoggerService,
    SnowflakeService,
    BrasilApiService,
    TenantContextService,
    SlugService,
    IdentityProvisioningService,
    NoopProvisioningService,
    CacheModule,
    RedisModule,
    RedisThrottlerStorageService,
    TenantResourceService,
  ],
})
export class CommonModule {}
