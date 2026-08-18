import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonModule } from 'src/common/common.module';
import { ProductsModule } from 'src/modules/catalog/products/products.module';
import { CinemaComplexesModule } from 'src/modules/operations/cinema-complexes/cinema-complexes.module';

import { StockMovementsController } from './controllers/stock-movements.controller';
import { ProductStockController } from './controllers/product-stock.controller';
import { StockMovementsService } from './services/stock-movements.service';
import { ProductStockService } from './services/product-stock.service';
import { StockMovementsRepository } from './repositories/stock-movements.repository';
import { ProductStockRepository } from './repositories/product-stock.repository';
import { StockMovementTypesRepository } from './repositories/stock-movement-types.repository';

@Module({
  imports: [PrismaModule, CommonModule, ProductsModule, CinemaComplexesModule],
  controllers: [StockMovementsController, ProductStockController],
  providers: [
    StockMovementsService,
    ProductStockService,
    StockMovementsRepository,
    ProductStockRepository,
    StockMovementTypesRepository,
  ],
  exports: [
    StockMovementsService,
    ProductStockService,
    StockMovementsRepository,
    ProductStockRepository,
  ],
})
export class StockModule {}
