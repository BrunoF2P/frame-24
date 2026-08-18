import { Module } from '@nestjs/common';
import { CommonModule } from 'src/common/common.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SeatStatusController } from './controllers/seat-status.controller';
import { SeatStatusRepository } from './repositories/seat-status.repository';
import { SeatStatusService } from './services/seat-status.service';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [SeatStatusController],
  providers: [SeatStatusService, SeatStatusRepository],
  exports: [SeatStatusRepository],
})
export class SeatStatusModule {}
