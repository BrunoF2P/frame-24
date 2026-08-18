import { forwardRef, Module } from '@nestjs/common';
import { CommonModule } from 'src/common/common.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RoomsModule } from '../rooms/rooms.module';
import { CinemaComplexesModule } from '../cinema-complexes/cinema-complexes.module';
import { SeatsController } from './controllers/seats.controller';
import { SeatsService } from './services/seats.service';
import { SeatsRepository } from './repositories/seats.repository';

@Module({
  imports: [
    PrismaModule,
    CommonModule,
    forwardRef(() => RoomsModule),
    CinemaComplexesModule,
  ],
  controllers: [SeatsController],
  providers: [SeatsService, SeatsRepository],
  exports: [SeatsRepository],
})
export class SeatsModule {}
