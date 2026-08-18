import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const CreateReceivableTransactionSchema = z.object({
  account_receivable_id: z.string().uuid(),
  amount: z.number().positive(),
  transaction_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  bank_account_id: z.string().uuid(),
  payment_method: z.string().optional(),
  notes: z.string().optional(),

  // Optional: Interest and penalty applied during settlement
  interest_amount: z.number().min(0).optional(),
  penalty_amount: z.number().min(0).optional(),
  discount_amount: z.number().min(0).optional(),
});

export class CreateReceivableTransactionDto extends createZodDto(
  CreateReceivableTransactionSchema,
) {
  @ApiProperty({
    description: 'ID da conta a receber para liquidar',
    example: '23425326464646652',
  })
  account_receivable_id!: string;

  @ApiProperty({
    description: 'Valor do recebimento',
    example: 1500.0,
  })
  amount!: number;

  @ApiProperty({
    description: 'Data da transação',
    example: '2025-11-25',
  })
  transaction_date!: string;

  @ApiProperty({
    description: 'ID da conta bancária para a transação',
    example: '23425326464646652',
  })
  bank_account_id!: string;

  @ApiPropertyOptional({
    description: 'Método de pagamento utilizado',
    example: 'credit_card',
  })
  payment_method?: string;

  @ApiPropertyOptional({
    description: 'Observações adicionais',
    example: 'Pagamento integral recebido',
  })
  notes?: string;

  @ApiPropertyOptional({
    description: 'Valor de juros aplicado na liquidação',
    example: 50.0,
  })
  interest_amount?: number;

  @ApiPropertyOptional({
    description: 'Valor de multa aplicado na liquidação',
    example: 25.0,
  })
  penalty_amount?: number;

  @ApiPropertyOptional({
    description: 'Valor de desconto aplicado na liquidação',
    example: 100.0,
  })
  discount_amount?: number;
}
