import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonModule } from 'src/common/common.module';
import { AccountsReceivableController } from './controllers/accounts-receivable.controller';
import { AccountsReceivableService } from './services/accounts-receivable.service';
import { AccountsReceivableRepository } from './repositories/accounts-receivable.repository';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [AccountsReceivableController],
  providers: [AccountsReceivableService, AccountsReceivableRepository],
  exports: [AccountsReceivableService, AccountsReceivableRepository],
})
export class AccountsReceivableModule {}
