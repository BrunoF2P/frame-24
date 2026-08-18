import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const CreatePurchaseSchema = z.object({
  cinema_complex_id: z.string().min(1, 'Complexo de cinema é obrigatório'),
  reservation_uuid: z.string().optional(),
  payment_method: z.string().min(1, 'Método de pagamento é obrigatório'),
  promotion_code: z.string().optional(),
  tickets: z
    .array(
      z.object({
        showtime_id: z.string().min(1, 'Sessão é obrigatória'),
        seat_id: z.string().optional(),
        ticket_type: z.string().optional(),
      }),
    )
    .min(1, 'Pelo menos um ingresso deve ser selecionado'),
  concession_items: z
    .array(
      z.object({
        item_type: z.enum(['PRODUCT', 'COMBO'], {
          message: 'Tipo de item inválido',
        }),
        item_id: z.string().min(1, 'Item é obrigatório'),
        quantity: z
          .number()
          .int('Quantidade deve ser um número inteiro')
          .min(1, 'Quantidade deve ser pelo menos 1'),
      }),
    )
    .optional(),
  discount_amount: z
    .number()
    .min(0, 'Desconto não pode ser negativo')
    .optional(),
  use_points: z
    .number()
    .int('Pontos devem ser um número inteiro')
    .min(0, 'Pontos não podem ser negativos')
    .optional(),
});

export class CreatePurchaseDto extends createZodDto(CreatePurchaseSchema) {
  @ApiProperty({
    description: 'ID do complexo de cinema',
    example: '243244130367442946',
  })
  cinema_complex_id!: string;

  @ApiPropertyOptional({
    description: 'UUID da reserva do WebSocket (se houver)',
    example: '243244130367443001-1234567890-abc123',
  })
  reservation_uuid?: string;

  @ApiProperty({
    description: 'ID do método de pagamento',
    example: '243244130367443001',
  })
  payment_method!: string;

  @ApiPropertyOptional({
    description: 'Código promocional para aplicar descontos',
    example: 'PROMO10',
  })
  promotion_code?: string;

  @ApiProperty({
    description: 'Lista de ingressos',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        showtime_id: { type: 'string' },
        seat_id: { type: 'string' },
        ticket_type: { type: 'string' },
      },
    },
  })
  tickets!: Array<{
    showtime_id: string;
    seat_id?: string;
    ticket_type?: string;
  }>;

  @ApiPropertyOptional({
    description: 'Itens de concessão (produtos/combos)',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        item_type: { type: 'string', enum: ['PRODUCT', 'COMBO'] },
        item_id: { type: 'string' },
        quantity: { type: 'number' },
      },
    },
  })
  concession_items?: Array<{
    item_type: 'PRODUCT' | 'COMBO';
    item_id: string;
    quantity: number;
  }>;

  @ApiPropertyOptional({
    description: 'Valor do desconto aplicado',
    example: 10.0,
    default: 0,
  })
  discount_amount?: number;

  @ApiPropertyOptional({
    description: 'Quantidade de pontos de fidelidade a usar como desconto',
    example: 100,
    default: 0,
  })
  use_points?: number;
}
