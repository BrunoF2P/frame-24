import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonModule } from 'src/common/common.module';
import { AccountsPayableController } from './controllers/accounts-payable.controller';
import { AccountsPayableService } from './services/accounts-payable.service';
import { AccountsPayableRepository } from './repositories/accounts-payable.repository';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [AccountsPayableController],
  providers: [AccountsPayableService, AccountsPayableRepository],
  exports: [AccountsPayableService, AccountsPayableRepository],
})
export class AccountsPayableModule {}
