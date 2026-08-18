import { Module } from '@nestjs/common';
import { MunicipalTaxParametersRepository } from './repositories/municipal-tax-parameters.repository';
import { FederalTaxRatesRepository } from './repositories/federal-tax-rates.repository';
import { TaxSetupService } from './services/tax-setup.service';
import { MunicipalTaxParametersService } from './services/municipal-tax-parameters.service';
import { CommonModule } from 'src/common/common.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MunicipalTaxParametersController } from './controllers/municipal-tax-parameters.controller';
import { FederalTaxRatesService } from './services/federal-tax-rates.service';
import { FederalTaxRatesController } from './controllers/federal-tax-rates.controller';
import { TaxEntriesController } from './controllers/tax-entries.controller';
import { TaxEntriesService } from './services/tax-entries.service';
import { TaxCalculationService } from './services/tax-calculation.service';
import { TaxEntriesRepository } from './repositories/tax-entries.repository';
import { CinemaComplexesModule } from 'src/modules/operations/cinema-complexes/cinema-complexes.module';
import { CashFlowModule } from '../finance/cash-flow/cash-flow.module';

@Module({
  imports: [CommonModule, PrismaModule, CinemaComplexesModule, CashFlowModule],
  controllers: [
    MunicipalTaxParametersController,
    FederalTaxRatesController,
    TaxEntriesController,
  ],
  providers: [
    MunicipalTaxParametersRepository,
    FederalTaxRatesRepository,
    TaxEntriesRepository,
    TaxSetupService,
    TaxCalculationService,
    MunicipalTaxParametersService,
    FederalTaxRatesService,
    TaxEntriesService,
  ],
  exports: [
    MunicipalTaxParametersRepository,
    FederalTaxRatesRepository,
    TaxEntriesRepository,
    TaxSetupService,
    TaxCalculationService,
    MunicipalTaxParametersService,
    FederalTaxRatesService,
    TaxEntriesService,
  ],
})
export class TaxModule {}
