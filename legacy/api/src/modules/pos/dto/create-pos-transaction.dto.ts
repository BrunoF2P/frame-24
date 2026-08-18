import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const CreatePosTransactionSchema = z
  .object({
    pos_session_id: z.string().min(1, 'Sessão PDV é obrigatória'),
    transaction_type: z.string().min(1, 'Tipo de transação é obrigatório'),
    payment_method: z.string().min(1, 'Método de pagamento é obrigatório'),
    amount: z.number().positive('Valor deve ser positivo'),
    change_amount: z.number().min(0, 'Troco não pode ser negativo').default(0),
    description: z
      .string()
      .max(255, 'Descrição deve ter no máximo 255 caracteres')
      .optional(),
    reference_type: z.string().max(50).optional(),
    reference_id: z.string().max(100).optional(),
  })
  .strict();

export class CreatePosTransactionDto extends createZodDto(
  CreatePosTransactionSchema,
) {
  @ApiProperty({
    description: 'ID da sessão PDV',
    example: '243244130367442946',
  })
  pos_session_id!: string;

  @ApiProperty({
    description: 'Tipo de transação',
    example: 'sale',
  })
  transaction_type!: string;

  @ApiProperty({
    description: 'ID do método de pagamento',
    example: '243244130367442947',
  })
  payment_method!: string;

  @ApiProperty({
    description: 'Valor da transação',
    example: 45.0,
  })
  amount!: number;

  @ApiProperty({
    description: 'Valor do troco',
    example: 5.0,
    default: 0,
  })
  change_amount!: number;

  @ApiPropertyOptional({
    description: 'Descrição da transação',
    example: 'Venda de 2 ingressos + combo',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Tipo da entidade referenciada',
    example: 'sale',
  })
  reference_type?: string;

  @ApiPropertyOptional({
    description: 'ID da entidade referenciada',
    example: '243244130367442948',
  })
  reference_id?: string;
}
