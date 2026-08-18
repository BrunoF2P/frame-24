import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonModule } from 'src/common/common.module';
import { AuthModule } from 'src/modules/identity/auth/auth.module';
import { CustomerAuthController } from './controllers/customer-auth.controller';
import { CustomerController } from './controllers/customer.controller';
import { CustomerPurchasesController } from './controllers/customer-purchases.controller';
import { CheckoutSessionsController } from './controllers/checkout-sessions.controller';
import { PaymentWebhooksController } from './controllers/payment-webhooks.controller';
import { CustomerAuthService } from './services/customer-auth.service';
import { CustomerPurchasesService } from './services/customer-purchases.service';
import { CheckoutSessionsService } from './services/checkout-sessions.service';
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
    CheckoutSessionsController,
    PaymentWebhooksController,
  ],
  providers: [
    CustomerAuthService,
    CustomerPurchasesService,
    CheckoutSessionsService,
    CustomerAccountService,
    CustomersRepository,
    CompanyCustomersRepository,
  ],
  exports: [
    CustomerAuthService,
    CustomersRepository,
    CompanyCustomersRepository,
    CheckoutSessionsService,
  ],
})
export class CrmModule {}
