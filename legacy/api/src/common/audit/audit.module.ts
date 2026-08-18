import { Module } from '@nestjs/common';
import { AuditLogService } from './services/audit-log.service';
import { AuditLogController } from './controllers/audit-log.controller';
import { AuditLogRepository } from './repositories/audit-log.repository';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RolesModule } from 'src/modules/identity/roles/roles.module';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [PrismaModule, RolesModule, CommonModule],
  controllers: [AuditLogController],
  providers: [AuditLogService, AuditLogRepository],
  exports: [AuditLogService],
})
export class AuditModule {}
