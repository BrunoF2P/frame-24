import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const CreateAccountPayableSchema = z.object({
  cinema_complex_id: z.string().uuid().optional(),
  supplier_id: z.string().uuid().optional(),
  source_type: z.enum(['distributor_settlement', 'tax', 'manual']).optional(),
  source_id: z.string().optional(),

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

export class CreateAccountPayableDto extends createZodDto(
  CreateAccountPayableSchema,
) {
  @ApiPropertyOptional({
    description: 'ID do complexo de cinema',
    example: '23425326464646652',
  })
  cinema_complex_id?: string;

  @ApiPropertyOptional({
    description: 'ID do fornecedor',
    example: '23425326464646652',
  })
  supplier_id?: string;

  @ApiPropertyOptional({
    description: 'Tipo de origem da conta a pagar',
    enum: ['distributor_settlement', 'tax', 'manual'],
    example: 'manual',
  })
  source_type?: 'distributor_settlement' | 'tax' | 'manual';

  @ApiPropertyOptional({
    description: 'ID de referência da origem',
  })
  source_id?: string;

  @ApiProperty({
    description: 'Número do documento (nota fiscal, boleto, etc)',
    example: 'INV-2025-001',
  })
  document_number!: string;

  @ApiProperty({
    description: 'Descrição da conta a pagar',
    example: 'Conta de luz mensal',
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
    example: 5000.0,
  })
  original_amount!: number;

  @ApiPropertyOptional({
    description: 'Valor de juros',
    example: 50.0,
  })
  interest_amount?: number;

  @ApiPropertyOptional({
    description: 'Valor de multa',
    example: 25.0,
  })
  penalty_amount?: number;

  @ApiPropertyOptional({
    description: 'Valor de desconto',
    example: 100.0,
  })
  discount_amount?: number;
}
