import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const CreateTicketTypeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(50, 'Nome deve ter no máximo 50 caracteres'),
  description: z
    .string()
    .trim()
    .max(255, 'Descrição deve ter no máximo 255 caracteres')
    .optional(),
  discount_percentage: z
    .number()
    .min(0, 'Desconto não pode ser negativo')
    .max(100, 'Desconto não pode ser maior que 100')
    .default(0)
    .optional(),
});

export class CreateTicketTypeDto extends createZodDto(CreateTicketTypeSchema) {
  @ApiProperty({
    description: 'Nome do tipo de ingresso',
    example: 'Meia-entrada',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Descrição do tipo de ingresso',
    example: 'Ingresso com 50% de desconto para beneficiários',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Percentual de desconto aplicado ao preço base',
    example: 50,
    default: 0,
  })
  discount_percentage?: number;
}
