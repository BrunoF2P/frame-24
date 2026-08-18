import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonModule } from 'src/common/common.module';
import { PublicController } from './controllers/public.controller';
import { PublicSalesController } from './controllers/public-sales.controller';
import { PublicService } from './services/public.service';
import { CinemaComplexesRepository } from 'src/modules/operations/cinema-complexes/repositories/cinema-complexes.repository';
import { ShowtimesRepository } from 'src/modules/operations/showtime_schedule/repositories/showtime.repository';
import { MovieRepository } from 'src/modules/catalog/movies/repositories/movie.repository';
import { ProductRepository } from 'src/modules/catalog/products/repositories/product.repository';
import { SeatsRepository } from 'src/modules/operations/seats/repositories/seats.repository';
import { SessionSeatStatusRepository } from 'src/modules/operations/session_seat_status/repositories/session-seat-status.repository';
import { SalesModule } from '../sales/sales.module';

@Module({
  imports: [PrismaModule, CommonModule, SalesModule],
  controllers: [PublicController, PublicSalesController],
  providers: [
    PublicService,
    CinemaComplexesRepository,
    ShowtimesRepository,
    MovieRepository,
    ProductRepository,
    SeatsRepository,
    SessionSeatStatusRepository,
  ],
  exports: [PublicService],
})
export class PublicModule {}
