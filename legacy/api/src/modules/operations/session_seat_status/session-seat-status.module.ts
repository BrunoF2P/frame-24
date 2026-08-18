import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SessionSeatStatusRepository } from './repositories/session-seat-status.repository';

@Module({
  imports: [PrismaModule],
  providers: [SessionSeatStatusRepository],
  exports: [SessionSeatStatusRepository],
})
export class SessionSeatStatusModule {}
