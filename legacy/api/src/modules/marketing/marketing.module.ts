import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonModule } from 'src/common/common.module';
import { CampaignsController } from './controllers/campaigns.controller';
import { PromotionTypesController } from './controllers/promotion-types.controller';
import { CampaignsService } from './services/campaigns.service';
import { PromotionTypesService } from './services/promotion-types.service';
import { CampaignsRepository } from './repositories/campaigns.repository';
import { PromotionTypesRepository } from './repositories/promotion-types.repository';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [CampaignsController, PromotionTypesController],
  providers: [
    CampaignsService,
    PromotionTypesService,
    CampaignsRepository,
    PromotionTypesRepository,
  ],
  exports: [
    CampaignsService,
    PromotionTypesService,
    CampaignsRepository,
    PromotionTypesRepository,
  ],
})
export class MarketingModule {}
