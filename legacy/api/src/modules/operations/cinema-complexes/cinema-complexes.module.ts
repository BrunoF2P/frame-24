import { Module } from '@nestjs/common';

import { CinemaComplexesController } from './controllers/cinema-complexes.controller';
import { CinemaComplexesRepository } from './repositories/cinema-complexes.repository';
import { CommonModule } from 'src/common/common.module';
import { CinemaComplexesService } from 'src/modules/operations/cinema-complexes/service/cinema-complexes.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [CinemaComplexesController],
  providers: [CinemaComplexesService, CinemaComplexesRepository],
  exports: [CinemaComplexesRepository],
})
export class CinemaComplexesModule {}
