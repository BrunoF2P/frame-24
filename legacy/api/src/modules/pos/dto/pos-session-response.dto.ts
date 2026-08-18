import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const PosSessionResponseSchema = z.object({
  id: z.string(),
  company_id: z.string(),
  cinema_complex_id: z.string(),
  operator_id: z.string(),
  status: z.string(),
  status_name: z.string().optional(),
  session_number: z.string(),
  opening_amount: z.number(),
  cash_withdrawn: z.number(),
  cash_counted: z.number().nullable(),
  difference: z.number().nullable(),
  total_sales_amount: z.number(),
  total_sales_count: z.number(),
  total_refunds_amount: z.number(),
  total_refunds_count: z.number(),
  total_discounts_amount: z.number(),
  total_received_amount: z.number(),
  total_change_given: z.number(),
  opened_at: z.string(),
  closed_at: z.string().nullable(),
  closing_notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
});

export class PosSessionResponseDto extends createZodDto(
  PosSessionResponseSchema,
) {
  @ApiProperty({
    description: 'ID da sessão PDV',
    example: '243244130367442946',
  })
  id!: string;

  @ApiProperty({ description: 'ID da empresa' })
  company_id!: string;

  @ApiProperty({ description: 'ID do complexo de cinema' })
  cinema_complex_id!: string;

  @ApiProperty({ description: 'ID do operador (company_user)' })
  operator_id!: string;

  @ApiProperty({ description: 'Status da sessão', example: 'open' })
  status!: string;

  @ApiPropertyOptional({
    description: 'Nome legível do status',
    example: 'Aberta',
  })
  status_name?: string;

  @ApiProperty({ description: 'Número da sessão', example: 'PDV-20260523-001' })
  session_number!: string;

  @ApiProperty({
    description: 'Valor de abertura (fundo de troco)',
    example: 200.0,
  })
  opening_amount!: number;

  @ApiProperty({ description: 'Total de retiradas em espécie', example: 0 })
  cash_withdrawn!: number;

  @ApiProperty({
    description: 'Valor contado no fechamento',
    nullable: true,
    example: 3450.75,
  })
  cash_counted!: number | null;

  @ApiProperty({
    description: 'Diferença apurada no fechamento',
    nullable: true,
    example: -2.5,
  })
  difference!: number | null;

  @ApiProperty({ description: 'Total vendido na sessão', example: 3250.0 })
  total_sales_amount!: number;

  @ApiProperty({ description: 'Quantidade de vendas', example: 42 })
  total_sales_count!: number;

  @ApiProperty({ description: 'Total de estornos', example: 50.0 })
  total_refunds_amount!: number;

  @ApiProperty({ description: 'Quantidade de estornos', example: 1 })
  total_refunds_count!: number;

  @ApiProperty({ description: 'Total de descontos concedidos', example: 120.0 })
  total_discounts_amount!: number;

  @ApiProperty({
    description: 'Total recebido (todas formas de pagamento)',
    example: 3080.0,
  })
  total_received_amount!: number;

  @ApiProperty({ description: 'Total de troco devolvido', example: 70.0 })
  total_change_given!: number;

  @ApiProperty({
    description: 'Data/hora de abertura',
    example: '2026-05-23T08:00:00.000Z',
  })
  opened_at!: string;

  @ApiProperty({
    description: 'Data/hora de fechamento',
    nullable: true,
    example: '2026-05-23T23:30:00.000Z',
  })
  closed_at!: string | null;

  @ApiProperty({ description: 'Observações de fechamento', nullable: true })
  closing_notes!: string | null;

  @ApiProperty({ description: 'Data de criação' })
  created_at!: string;

  @ApiProperty({ description: 'Data de atualização', nullable: true })
  updated_at!: string | null;
}
