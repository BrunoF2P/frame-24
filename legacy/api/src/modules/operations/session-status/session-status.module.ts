import { Module } from '@nestjs/common';
import { CommonModule } from 'src/common/common.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SessionStatusController } from './controllers/session-status.controller';
import { SessionStatusRepository } from './repositories/session-status.repository';
import { SessionStatusService } from './services/session-status.service';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [SessionStatusController],
  providers: [SessionStatusService, SessionStatusRepository],
  exports: [SessionStatusRepository],
})
export class SessionStatusModule {}
