import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CompanyService } from './services/company.service';
import { CompanyRepository } from './repositories/company.repository';
import { LoggerService } from 'src/common/services/logger.service';
import { AuthModule } from 'src/modules/identity/auth/auth.module';
import { SuppliersModule } from 'src/modules/inventory/suppliers/suppliers.module';
import { CommonModule } from 'src/common/common.module';
import { BrasilApiService } from 'src/common/services/brasil-api.service';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => AuthModule),
    SuppliersModule,
    CommonModule,
  ],
  controllers: [],
  providers: [
    CompanyRepository,
    CompanyService,
    LoggerService,
    BrasilApiService,
  ],
  exports: [CompanyService],
})
export class CompanyModule {}
