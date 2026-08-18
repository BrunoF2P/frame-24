import { Module } from '@nestjs/common';
import { CinemaComplexesModule } from './cinema-complexes/cinema-complexes.module';
import { AudioTypesModule } from 'src/modules/operations/audio-types/audio-types.module';
import { SeatTypesModule } from 'src/modules/operations/seat-types/seat-types.module';
import { ProjectionTypesModule } from 'src/modules/operations/projection-types/projection-types.module';
import { RoomsModule } from 'src/modules/operations/rooms/rooms.module';
import { ShowtimesModule } from 'src/modules/operations/showtime_schedule/showtime.module';
import { SessionSeatStatusModule } from 'src/modules/operations/session_seat_status/session-seat-status.module';
import { SessionLanguagesModule } from 'src/modules/operations/session_languages/session-languages.module';
import { SeatStatusModule } from 'src/modules/operations/seat-status/seat-status.module';
import { SeatsModule } from 'src/modules/operations/seats/seats.module';
import { SessionStatusModule } from 'src/modules/operations/session-status/session-status.module';

@Module({
  imports: [
    CinemaComplexesModule,
    AudioTypesModule,
    SeatTypesModule,
    ProjectionTypesModule,
    RoomsModule,
    ShowtimesModule,
    SeatsModule,
    SeatStatusModule,
    SessionStatusModule,
    SessionLanguagesModule,
    SessionSeatStatusModule,
  ],
})
export class OperationsModule {}
