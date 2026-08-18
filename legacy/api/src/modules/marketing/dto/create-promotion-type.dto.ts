import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { CreatePromotionTypeSchema } from './create-promotion-type.schema';

export class CreatePromotionTypeDto extends createZodDto(
  CreatePromotionTypeSchema,
) {
  @ApiProperty({
    description: 'Código único do tipo de promoção por empresa',
    example: 'PERCENTUAL',
    maxLength: 30,
  })
  code!: string;

  @ApiProperty({
    description: 'Nome amigável apresentado no dashboard',
    example: 'Desconto percentual',
    maxLength: 100,
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Descrição detalhada do tipo de promoção',
    example:
      'Aplica um desconto baseado em percentual sobre o valor do pedido.',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Define se o tipo está ativo para novas campanhas',
    example: true,
    default: true,
  })
  active?: boolean;
}

export class PromotionTypeResponseDto {
  @ApiProperty({
    description: 'Identificador do tipo',
    example: '01JAB1234XYZ',
  })
  id!: string;

  @ApiProperty({ description: 'Código interno único', example: 'PERCENTUAL' })
  code!: string;

  @ApiProperty({
    description: 'Nome apresentado no dashboard',
    example: 'Desconto percentual',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Descrição detalhada',
    example: 'Aplica um desconto baseado em percentual sobre o subtotal.',
  })
  description?: string | null;

  @ApiProperty({
    description: 'Status do tipo de promoção',
    example: true,
    default: true,
  })
  active!: boolean | null;

  @ApiProperty({
    description: 'Data de criação',
    example: '2025-01-10T12:00:00.000Z',
  })
  created_at!: Date | null;
}
