import { Module } from '@nestjs/common';
import { CommonModule } from 'src/common/common.module';

// Módulos que este service precisa
import { CinemaComplexesModule } from '../cinema-complexes/cinema-complexes.module';
import { RoomsModule } from '../rooms/rooms.module';
import { SeatsModule } from '../seats/seats.module';
import { MoviesModule } from '../../catalog/movies/movies.module';
import { SeatStatusModule } from 'src/modules/operations/seat-status/seat-status.module';
import { SessionSeatStatusModule } from 'src/modules/operations/session_seat_status/session-seat-status.module';
import { ShowtimesController } from 'src/modules/operations/showtime_schedule/controllers/showtimes.controller';
import { ShowtimesService } from 'src/modules/operations/showtime_schedule/services/showtimes.service';
import { ShowtimesRepository } from 'src/modules/operations/showtime_schedule/repositories/showtime.repository';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SessionStatusModule } from 'src/modules/operations/session-status/session-status.module';
import { ContractsModule } from 'src/modules/contracts/contracts.module';
import { TaxModule } from 'src/modules/tax/tax.module';
import { SeatTypesModule } from 'src/modules/operations/seat-types/seat-types.module';
import { ProjectionTypesModule } from 'src/modules/operations/projection-types/projection-types.module';
import { AudioTypesModule } from 'src/modules/operations/audio-types/audio-types.module';

@Module({
  imports: [
    PrismaModule,
    CommonModule,
    CinemaComplexesModule,
    RoomsModule,
    SeatsModule,
    MoviesModule,
    SeatStatusModule,
    SessionSeatStatusModule,
    SessionStatusModule,
    ContractsModule,
    TaxModule,
    SeatTypesModule,
    ProjectionTypesModule,
    AudioTypesModule,
  ],
  controllers: [ShowtimesController],
  providers: [ShowtimesService, ShowtimesRepository],
  exports: [ShowtimesService, ShowtimesRepository],
})
export class ShowtimesModule {}
