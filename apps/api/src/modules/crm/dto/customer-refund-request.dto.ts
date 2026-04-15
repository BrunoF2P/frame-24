import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const RefundItemSchema = z.object({
  item_type: z.enum(['ticket', 'concession']),
  item_id: z.string().min(1),
  quantity: z.number().int().positive().optional(),
});

export const CreateCustomerRefundRequestSchema = z.object({
  reason: z.string().min(3).max(500).optional(),
  items: z
    .array(RefundItemSchema)
    .min(1, 'Selecione ao menos um item para solicitar reembolso'),
});

export class CreateCustomerRefundRequestDto extends createZodDto(
  CreateCustomerRefundRequestSchema,
) {
  @ApiPropertyOptional({
    description: 'Motivo da solicitação de reembolso',
    example: 'Não poderei comparecer.',
  })
  reason?: string;

  @ApiProperty({
    description: 'Itens do pedido que entram na solicitação',
    type: [Object],
  })
  items!: Array<{
    item_type: 'ticket' | 'concession';
    item_id: string;
    quantity?: number;
  }>;
}
