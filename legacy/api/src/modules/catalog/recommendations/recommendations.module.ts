import { Module } from '@nestjs/common';
import { CommonModule } from 'src/common/common.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CrmModule } from 'src/modules/crm/crm.module';
import { RecommendationEventsRepository } from './repositories/recommendation-events.repository';
import { RecommendationEventsService } from './services/recommendation-events.service';

@Module({
  imports: [PrismaModule, CommonModule, CrmModule],
  providers: [RecommendationEventsRepository, RecommendationEventsService],
  exports: [RecommendationEventsRepository, RecommendationEventsService],
})
export class RecommendationsModule {}
