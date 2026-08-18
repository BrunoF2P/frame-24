import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const CreateAccountReceivableSchema = z.object({
  cinema_complex_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  sale_id: z.string().uuid().optional(),

  document_number: z.string().min(1).max(50),
  description: z.string().min(1),

  issue_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  due_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  competence_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),

  original_amount: z.number().positive(),
  interest_amount: z.number().min(0).optional(),
  penalty_amount: z.number().min(0).optional(),
  discount_amount: z.number().min(0).optional(),
});

export class CreateAccountReceivableDto extends createZodDto(
  CreateAccountReceivableSchema,
) {
  @ApiPropertyOptional({
    description: 'ID do complexo de cinema',
    example: '23425326464646652',
  })
  cinema_complex_id?: string;

  @ApiPropertyOptional({
    description: 'ID do cliente',
    example: '23425326464646652',
  })
  customer_id?: string;

  @ApiPropertyOptional({
    description: 'ID de referência da venda',
    example: '23425326464646652',
  })
  sale_id?: string;

  @ApiProperty({
    description: 'Número do documento (nota fiscal, recibo, etc)',
    example: 'REC-2025-001',
  })
  document_number!: string;

  @ApiProperty({
    description: 'Descrição da conta a receber',
    example: 'Venda de ingressos - Sessão #123',
  })
  description!: string;

  @ApiProperty({
    description: 'Data de emissão',
    example: '2025-11-01',
  })
  issue_date!: string;

  @ApiProperty({
    description: 'Data de vencimento',
    example: '2025-11-30',
  })
  due_date!: string;

  @ApiProperty({
    description: 'Data de competência (período contábil)',
    example: '2025-11-01',
  })
  competence_date!: string;

  @ApiProperty({
    description: 'Valor original',
    example: 1500.0,
  })
  original_amount!: number;

  @ApiPropertyOptional({
    description: 'Valor de juros',
    example: 30.0,
  })
  interest_amount?: number;

  @ApiPropertyOptional({
    description: 'Valor de multa',
    example: 15.0,
  })
  penalty_amount?: number;

  @ApiPropertyOptional({
    description: 'Valor de desconto',
    example: 50.0,
  })
  discount_amount?: number;
}
