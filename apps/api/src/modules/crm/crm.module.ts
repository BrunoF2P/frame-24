import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonModule } from 'src/common/common.module';
import { AuthModule } from 'src/modules/identity/auth/auth.module';
import { CustomerAuthController } from './controllers/customer-auth.controller';
import { CustomerController } from './controllers/customer.controller';
import { CustomerPurchasesController } from './controllers/customer-purchases.controller';
import { CustomerAuthService } from './services/customer-auth.service';
import { CustomerPurchasesService } from './services/customer-purchases.service';
import { CustomersRepository } from './repositories/customers.repository';
import { CompanyCustomersRepository } from './repositories/company-customers.repository';
import { SalesModule } from 'src/modules/sales/sales.module';
import { EmailModule } from 'src/modules/email/email.module';
import { CustomerAccountService } from './services/customer-account.service';

@Module({
  imports: [PrismaModule, CommonModule, AuthModule, SalesModule, EmailModule],
  controllers: [
    CustomerAuthController,
    CustomerController,
    CustomerPurchasesController,
  ],
  providers: [
    CustomerAuthService,
    CustomerPurchasesService,
    CustomerAccountService,
    CustomersRepository,
    CompanyCustomersRepository,
  ],
  exports: [
    CustomerAuthService,
    CustomersRepository,
    CompanyCustomersRepository,
  ],
})
export class CrmModule {}
