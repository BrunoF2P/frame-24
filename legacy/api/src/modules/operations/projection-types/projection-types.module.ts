import { Module } from '@nestjs/common';
import { CommonModule } from 'src/common/common.module';

import { PrismaModule } from 'src/prisma/prisma.module';

import { ProjectionTypesController } from './controllers/projection-types.controller';
import { ProjectionTypesService } from './services/projection-types.service';
import { ProjectionTypesRepository } from './repositories/projection-types.repository';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [ProjectionTypesController],
  providers: [ProjectionTypesService, ProjectionTypesRepository],
  exports: [ProjectionTypesRepository],
})
export class ProjectionTypesModule {}
