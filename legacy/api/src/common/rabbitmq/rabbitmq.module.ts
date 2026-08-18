import { Module, Global } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { RabbitMQPublisherService } from './rabbitmq-publisher.service';
import { LoggerService } from '../services/logger.service';

@Global()
@Module({
  imports: [ClsModule.forFeature()],
  providers: [RabbitMQPublisherService, LoggerService],
  exports: [RabbitMQPublisherService, LoggerService],
})
export class RabbitMQModule {}
