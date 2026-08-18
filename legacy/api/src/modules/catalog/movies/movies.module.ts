import { Module } from '@nestjs/common';
import { AuthModule } from 'src/modules/identity/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonModule } from 'src/common/common.module';
import { MoviesController } from './controllers/movies.controller';
import { MoviesService } from './services/movies.service';
import { MovieRepository } from './repositories/movie.repository';
import { SupplierRepository } from 'src/modules/inventory/suppliers/repositories/supplier.repository';

@Module({
  imports: [PrismaModule, AuthModule, CommonModule],
  controllers: [MoviesController],
  providers: [MoviesService, MovieRepository, SupplierRepository],
  exports: [MoviesService, MovieRepository],
})
export class MoviesModule {}
