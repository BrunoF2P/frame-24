import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const CreateStockMovementSchema = z.object({
  product_id: z.string(),
  complex_id: z.string(),
  movement_type: z.string(),
  quantity: z.number().int(),
  unit_value: z.number().min(0).optional(),
  origin_type: z.string().optional(),
  origin_id: z.string().optional(),
  observations: z.string().optional(),
});

export class CreateStockMovementDto extends createZodDto(
  CreateStockMovementSchema,
) {
  @ApiProperty({
    description: 'ID do produto',
    example: '243244130367442946',
  })
  product_id!: string;

  @ApiProperty({
    description: 'ID do complexo de cinema',
    example: '243244130367442999',
  })
  complex_id!: string;

  @ApiProperty({
    description: 'ID do tipo de movimentação',
    example: '243244130367443000',
  })
  movement_type!: string;

  @ApiProperty({
    description: 'Quantidade movimentada',
    example: 10,
  })
  quantity!: number;

  @ApiPropertyOptional({
    description: 'Valor unitário',
    example: 5.5,
  })
  unit_value?: number;

  @ApiPropertyOptional({
    description: 'Tipo de origem (ex: SALE, PURCHASE)',
    example: 'PURCHASE',
  })
  origin_type?: string;

  @ApiPropertyOptional({
    description: 'ID da origem',
    example: '243244130367443001',
  })
  origin_id?: string;

  @ApiPropertyOptional({
    description: 'Observações',
    example: 'Entrada de estoque por compra',
  })
  observations?: string;
}
