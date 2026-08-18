import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonModule } from 'src/common/common.module';
import { SessionSeatStatusModule } from 'src/modules/operations/session_seat_status/session-seat-status.module';
import { SeatStatusModule } from 'src/modules/operations/seat-status/seat-status.module';
import { AdminOperationsController } from './controllers/admin-operations.controller';
import { AdminOperationsService } from './services/admin-operations.service';
import { SalesModule } from '../sales/sales.module';

@Module({
  imports: [
    PrismaModule,
    CommonModule,
    SessionSeatStatusModule,
    SeatStatusModule,
    SalesModule,
  ],
  controllers: [AdminOperationsController],
  providers: [AdminOperationsService],
})
export class AdminModule {}
