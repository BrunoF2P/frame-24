import { Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { LoggerService } from './services/logger.service';
import { SnowflakeService } from './services/snowflake.service';
import { BrasilApiService } from './services/brasil-api.service';
import { TenantContextService } from './services/tenant-context.service';
import { SlugService } from './services/slug.service';
import { KeycloakProvisioningService } from './services/keycloak-provisioning.service';
import { RabbitMQModule } from 'src/common/rabbitmq/rabbitmq.module';
import { CacheModule } from './cache/cache.module';

@Module({
  imports: [ClsModule.forFeature(), RabbitMQModule, CacheModule],
  providers: [
    LoggerService,
    SnowflakeService,
    BrasilApiService,
    TenantContextService,
    SlugService,
    KeycloakProvisioningService,
  ],
  exports: [
    RabbitMQModule,
    LoggerService,
    SnowflakeService,
    BrasilApiService,
    TenantContextService,
    SlugService,
    KeycloakProvisioningService,
    CacheModule,
  ],
})
export class CommonModule {}
