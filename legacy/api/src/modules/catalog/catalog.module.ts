import { Module } from '@nestjs/common';
import { ProductsModule } from './products/products.module';
import { MoviesModule } from 'src/modules/catalog/movies/movies.module';
import { MovieCategoriesModule } from 'src/modules/catalog/movie_categories/movie-categories.module';
import { CommonModule } from 'src/common/common.module';
import { RecommendationsModule } from 'src/modules/catalog/recommendations/recommendations.module';

@Module({
  imports: [
    ProductsModule,
    MoviesModule,
    MovieCategoriesModule,
    RecommendationsModule,
    CommonModule,
  ],
  exports: [RecommendationsModule],
})
export class CatalogModule {}
