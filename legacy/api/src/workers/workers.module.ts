import { Module } from '@nestjs/common';
import { AuditWorkerService } from './audit-worker.service';
import { AuditConsumerService } from './audit-consumer.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonModule } from 'src/common/common.module';
import { RabbitMQModule } from 'src/common/rabbitmq/rabbitmq.module';

@Module({
  imports: [PrismaModule, CommonModule, RabbitMQModule],
  providers: [AuditWorkerService, AuditConsumerService],
  exports: [AuditWorkerService],
})
export class WorkersModule {}
