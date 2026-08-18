import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ExhibitionContractsRepository } from './repositories/exhibition-contracts.repository';
import { ContractTypesRepository } from './repositories/contract-types.repository';
import { ExhibitionContractsService } from './services/exhibition-contracts.service';
import { ContractTypesService } from './services/contract-types.service';
import { ExhibitionContractsController } from './controllers/exhibition-contracts.controller';
import { ContractTypesController } from './controllers/contract-types.controller';
import { MoviesModule } from 'src/modules/catalog/movies/movies.module';
import { CinemaComplexesModule } from 'src/modules/operations/cinema-complexes/cinema-complexes.module';
import { SupplierRepository } from 'src/modules/inventory/suppliers/repositories/supplier.repository';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [PrismaModule, CommonModule, MoviesModule, CinemaComplexesModule],
  controllers: [ExhibitionContractsController, ContractTypesController],
  providers: [
    ExhibitionContractsRepository,
    ContractTypesRepository,
    ExhibitionContractsService,
    ContractTypesService,
    SupplierRepository,
  ],
  exports: [
    ExhibitionContractsRepository,
    ContractTypesRepository,
    ExhibitionContractsService,
    ContractTypesService,
  ],
})
export class ContractsModule {}
