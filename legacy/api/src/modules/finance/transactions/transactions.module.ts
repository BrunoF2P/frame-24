import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonModule } from 'src/common/common.module';
import { TransactionsController } from './controllers/transactions.controller';
import { TransactionsService } from './services/transactions.service';
import { AccountsReceivableModule } from '../accounts-receivable/accounts-receivable.module';
import { AccountsPayableModule } from '../accounts-payable/accounts-payable.module';
import { CashFlowModule } from '../cash-flow/cash-flow.module';

@Module({
  imports: [
    PrismaModule,
    CommonModule,
    AccountsReceivableModule,
    AccountsPayableModule,
    CashFlowModule,
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
