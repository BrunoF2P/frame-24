import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonModule } from 'src/common/common.module';
import { BankAccountsController } from './controllers/bank-accounts.controller';
import { CashFlowEntriesController } from './controllers/cash-flow-entries.controller';
import { CashFlowReportsController } from './controllers/cash-flow-reports.controller';
import { BankReconciliationController } from './controllers/bank-reconciliation.controller';
import { BankAccountsService } from './services/bank-accounts.service';
import { CashFlowEntriesService } from './services/cash-flow-entries.service';
import { CashFlowReportsService } from './services/cash-flow-reports.service';
import { BankReconciliationService } from './services/bank-reconciliation.service';
import { BankAccountsRepository } from './repositories/bank-accounts.repository';
import { CashFlowEntriesRepository } from './repositories/cash-flow-entries.repository';
import { BankReconciliationRepository } from './repositories/bank-reconciliation.repository';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [
    BankAccountsController,
    CashFlowEntriesController,
    CashFlowReportsController,
    BankReconciliationController,
  ],
  providers: [
    BankAccountsService,
    CashFlowEntriesService,
    CashFlowReportsService,
    BankReconciliationService,
    BankAccountsRepository,
    CashFlowEntriesRepository,
    BankReconciliationRepository,
  ],
  exports: [
    BankAccountsService,
    CashFlowEntriesService,
    CashFlowReportsService,
    BankReconciliationService,
    BankAccountsRepository,
  ],
})
export class CashFlowModule {}
