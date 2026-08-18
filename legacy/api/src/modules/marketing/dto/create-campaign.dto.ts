import { createZodDto } from 'nestjs-zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateCampaignSchema } from './create-campaign.schema';

export class CreateCampaignDto extends createZodDto(CreateCampaignSchema) {
  @ApiProperty({
    description: 'ID do tipo de promoção (ex.: percentual, valor fixo)',
    example: 'PROMO_PERCENT',
  })
  promotion_type_id!: string;

  @ApiProperty({
    description: 'Código único da campanha por empresa',
    example: 'WEEKEND50',
  })
  campaign_code!: string;

  @ApiProperty({
    description: 'Nome público da campanha',
    example: 'Fim de semana 50% OFF',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Descrição detalhada apresentada no dashboard',
    example: 'Aplica 50% de desconto em todas as sessões de sábado e domingo.',
  })
  description?: string;

  @ApiProperty({
    description: 'Data/hora inicial de validade (ISO 8601)',
    example: '2025-02-01T00:00:00.000Z',
  })
  start_date!: Date;

  @ApiProperty({
    description: 'Data/hora final da campanha (ISO 8601)',
    example: '2025-03-15T23:59:59.999Z',
  })
  end_date!: Date;
}
