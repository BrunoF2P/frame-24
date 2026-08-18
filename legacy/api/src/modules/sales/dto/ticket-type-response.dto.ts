import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const TicketTypeResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  discount_percentage: z.number(),
  price_modifier: z.number(),
  ticket_count: z.number().optional(),
});

export class TicketTypeResponseDto extends createZodDto(
  TicketTypeResponseSchema,
) {
  @ApiProperty({
    description: 'ID do tipo de ingresso',
    example: '243244130367442946',
  })
  id!: string;

  @ApiProperty({
    description: 'Nome do tipo de ingresso',
    example: 'Inteira',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Descrição do tipo de ingresso',
    example: 'Ingresso sem desconto',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({
    description: 'Percentual de desconto aplicado ao preço base',
    example: 50,
  })
  discount_percentage!: number;

  @ApiProperty({
    description: 'Multiplicador aplicado ao preço final',
    example: 0.5,
  })
  price_modifier!: number;

  @ApiPropertyOptional({
    description: 'Quantidade de ingressos já emitidos com este tipo',
    example: 18,
  })
  ticket_count?: number;
}
