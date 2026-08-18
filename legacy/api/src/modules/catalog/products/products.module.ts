import { Module } from '@nestjs/common';
import { ProductsController } from './controllers/products.controller';
import { ProductCategoriesController } from './controllers/product-categories.controller';
import { ProductsService } from './services/products.service';
import { ProductCategoriesService } from './services/product-categories.service';
import { ProductRepository } from './repositories/product.repository';
import { ProductCategoryRepository } from './repositories/product-category.repository';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [ProductsController, ProductCategoriesController],
  providers: [
    ProductsService,
    ProductCategoriesService,
    ProductRepository,
    ProductCategoryRepository,
  ],
  exports: [
    ProductsService,
    ProductCategoriesService,
    ProductRepository,
    ProductCategoryRepository,
  ],
})
export class ProductsModule {}
