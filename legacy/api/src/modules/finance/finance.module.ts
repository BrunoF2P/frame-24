import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonModule } from 'src/common/common.module';
import { CashFlowModule } from './cash-flow/cash-flow.module';
import { AccountsReceivableModule } from './accounts-receivable/accounts-receivable.module';
import { AccountsPayableModule } from './accounts-payable/accounts-payable.module';
import { TransactionsModule } from './transactions/transactions.module';
import { FinanceReportsModule } from './reports/finance-reports.module';
import { ChartOfAccountsController } from './controllers/chart-of-accounts.controller';
import { JournalEntriesController } from './controllers/journal-entries.controller';
import { DistributorSettlementsController } from './controllers/distributor-settlements.controller';
import { ChartOfAccountsService } from './services/chart-of-accounts.service';
import { JournalEntriesService } from './services/journal-entries.service';
import { DistributorSettlementsService } from './services/distributor-settlements.service';
import { FinanceReportsService } from './services/finance-reports.service';
import { AgingAutomationService } from './services/aging-automation.service';

@Module({
  imports: [
    PrismaModule,
    CommonModule,
    ScheduleModule.forRoot(),
    CashFlowModule,
    AccountsReceivableModule,
    AccountsPayableModule,
    TransactionsModule,
    FinanceReportsModule,
  ],
  controllers: [
    ChartOfAccountsController,
    JournalEntriesController,
    DistributorSettlementsController,
  ],
  providers: [
    ChartOfAccountsService,
    JournalEntriesService,
    DistributorSettlementsService,
    FinanceReportsService,
    AgingAutomationService,
  ],
  exports: [
    ChartOfAccountsService,
    JournalEntriesService,
    DistributorSettlementsService,
    FinanceReportsService,
  ],
})
export class FinanceModule {}
