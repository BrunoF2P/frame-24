import { forwardRef, Module } from '@nestjs/common';
import { CommonModule } from 'src/common/common.module';

import { RoomsController } from './controllers/rooms.controller';
import { RoomsService } from './services/rooms.service';
import { RoomsRepository } from './repositories/rooms.repository';

import { SeatsModule } from '../seats/seats.module';
import { CinemaComplexesModule } from '../cinema-complexes/cinema-complexes.module';
import { AudioTypesModule } from '../audio-types/audio-types.module';
import { ProjectionTypesModule } from '../projection-types/projection-types.module';
import { SeatTypesModule } from '../seat-types/seat-types.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    CommonModule,
    forwardRef(() => SeatsModule),
    CinemaComplexesModule,
    AudioTypesModule,
    ProjectionTypesModule,
    SeatTypesModule,
  ],
  controllers: [RoomsController],
  providers: [RoomsService, RoomsRepository],
  exports: [RoomsRepository],
})
export class RoomsModule {}
