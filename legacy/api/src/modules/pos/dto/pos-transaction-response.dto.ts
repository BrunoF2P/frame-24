import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const PosTransactionResponseSchema = z.object({
  id: z.string(),
  pos_session_id: z.string(),
  sale_id: z.string().nullable(),
  company_id: z.string(),
  cinema_complex_id: z.string(),
  operator_id: z.string(),
  transaction_type: z.string(),
  payment_method: z.string(),
  payment_method_name: z.string().optional(),
  amount: z.number(),
  change_amount: z.number(),
  description: z.string().nullable(),
  reference_type: z.string().nullable(),
  reference_id: z.string().nullable(),
  performed_at: z.string(),
  created_at: z.string(),
});

export class PosTransactionResponseDto extends createZodDto(
  PosTransactionResponseSchema,
) {
  @ApiProperty({ description: 'ID da transação' })
  id!: string;

  @ApiProperty({ description: 'ID da sessão PDV' })
  pos_session_id!: string;

  @ApiProperty({ description: 'ID da venda vinculada', nullable: true })
  sale_id!: string | null;

  @ApiProperty({ description: 'ID da empresa' })
  company_id!: string;

  @ApiProperty({ description: 'ID do complexo de cinema' })
  cinema_complex_id!: string;

  @ApiProperty({ description: 'ID do operador' })
  operator_id!: string;

  @ApiProperty({ description: 'Tipo de transação', example: 'sale' })
  transaction_type!: string;

  @ApiProperty({ description: 'ID do método de pagamento' })
  payment_method!: string;

  @ApiPropertyOptional({
    description: 'Nome do método de pagamento',
    example: 'Dinheiro',
  })
  payment_method_name?: string;

  @ApiProperty({ description: 'Valor da transação', example: 45.0 })
  amount!: number;

  @ApiProperty({ description: 'Valor do troco', example: 5.0 })
  change_amount!: number;

  @ApiProperty({ description: 'Descrição', nullable: true })
  description!: string | null;

  @ApiProperty({ description: 'Tipo da entidade referenciada', nullable: true })
  reference_type!: string | null;

  @ApiProperty({ description: 'ID da entidade referenciada', nullable: true })
  reference_id!: string | null;

  @ApiProperty({ description: 'Data/hora da execução' })
  performed_at!: string;

  @ApiProperty({ description: 'Data de criação' })
  created_at!: string;
}
