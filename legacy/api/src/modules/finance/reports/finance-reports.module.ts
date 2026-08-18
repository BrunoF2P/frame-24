import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonModule } from 'src/common/common.module';
import { AgingReportsController } from './controllers/aging-reports.controller';
import { AgingReportsService } from './services/aging-reports.service';
import { PositionReportsService } from './services/position-reports.service';
import { FinanceReportsService } from '../services/finance-reports.service';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [AgingReportsController],
  providers: [
    AgingReportsService,
    PositionReportsService,
    FinanceReportsService,
  ],
})
export class FinanceReportsModule {}
