import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonModule } from 'src/common/common.module';
import { MovieCategoriesController } from './controllers/movie-categories.controller';
import { MovieCategoriesService } from './services/movie-categories.service';
import { MovieCategoryRepository } from './repositories/movie-category.repository';
import { RabbitMQModule } from 'src/common/rabbitmq/rabbitmq.module';

@Module({
  imports: [PrismaModule, CommonModule, RabbitMQModule],
  controllers: [MovieCategoriesController],
  providers: [MovieCategoriesService, MovieCategoryRepository],
  exports: [MovieCategoriesService, MovieCategoryRepository],
})
export class MovieCategoriesModule {}
