import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const CreateSaleSchema = z.object({
  cinema_complex_id: z.string(),
  customer_id: z.string().optional(),
  reservation_uuid: z.string().optional(),
  sale_type: z.string().optional(),
  payment_method: z.string(),
  promotion_code: z.string().optional(),
  tickets: z
    .array(
      z.object({
        showtime_id: z.string(),
        seat_id: z.string().optional(),
        ticket_type: z.string().optional(),
      }),
    )
    .min(1),
  concession_items: z
    .array(
      z.object({
        item_type: z.enum(['PRODUCT', 'COMBO']),
        item_id: z.string(),
        quantity: z.number().int().min(1),
      }),
    )
    .optional(),
  discount_amount: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export class CreateSaleDto extends createZodDto(CreateSaleSchema) {
  @ApiProperty({
    description: 'ID do complexo de cinema',
    example: '243244130367442946',
  })
  cinema_complex_id!: string;

  @ApiPropertyOptional({
    description: 'ID do cliente (opcional)',
    example: '243244130367442999',
  })
  customer_id?: string;

  @ApiPropertyOptional({
    description: 'UUID da reserva de assentos criada no checkout/socket',
    example: '243244130367443001-1234567890-abc123',
  })
  reservation_uuid?: string;

  @ApiPropertyOptional({
    description: 'ID do tipo de venda',
    example: '243244130367443000',
  })
  sale_type?: string;

  @ApiProperty({
    description: 'ID do método de pagamento',
    example: '243244130367443001',
  })
  payment_method!: string;

  @ApiPropertyOptional({
    description: 'Código promocional aplicado à venda',
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
    description: 'Observações da venda',
    example: 'Cliente VIP',
  })
  notes?: string;
}
