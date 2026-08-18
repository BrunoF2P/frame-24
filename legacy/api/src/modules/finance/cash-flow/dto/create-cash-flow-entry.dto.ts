import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const CreateCashFlowEntrySchema = z.object({
  bank_account_id: z.string().min(1),
  cinema_complex_id: z.string().optional(),
  entry_type: z.enum(['receipt', 'payment']),
  category: z.string().min(1).max(50),
  amount: z.number().positive(),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  competence_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  description: z.string().min(1),
  document_number: z.string().max(50).optional(),
  source_type: z.string().max(50).optional(),
  source_id: z.string().optional(),
  counterpart_type: z.string().max(50).optional(),
  counterpart_id: z.string().optional(),
  status: z.enum(['pending', 'confirmed', 'reconciled']).optional(),
});

export class CreateCashFlowEntryDto extends createZodDto(
  CreateCashFlowEntrySchema,
) {
  @ApiProperty({
    description: 'ID da conta bancária',
    example: '23425326464646652',
  })
  bank_account_id!: string;

  @ApiPropertyOptional({
    description: 'ID do complexo de cinema',
    example: '23425326464646652',
  })
  cinema_complex_id?: string;

  @ApiProperty({
    description: 'Tipo de lançamento',
    enum: ['receipt', 'payment'],
    example: 'receipt',
  })
  entry_type!: 'receipt' | 'payment';

  @ApiProperty({
    description: 'Categoria',
    example: 'ticket_sales',
  })
  category!: string;

  @ApiProperty({
    description: 'Valor',
    example: 5000.0,
  })
  amount!: number;

  @ApiProperty({
    description: 'Data do lançamento (YYYY-MM-DD)',
    example: '2025-11-25',
  })
  entry_date!: string;

  @ApiPropertyOptional({
    description: 'Data de competência (YYYY-MM-DD)',
    example: '2025-11-01',
  })
  competence_date?: string;

  @ApiProperty({
    description: 'Descrição',
    example: 'Venda de ingressos da sessão #123',
  })
  description!: string;

  @ApiPropertyOptional({
    description: 'Número do documento',
    example: 'DOC-2025-001',
  })
  document_number?: string;

  @ApiPropertyOptional({
    description: 'Tipo de origem',
    example: 'sale',
  })
  source_type?: string;

  @ApiPropertyOptional({
    description: 'ID da origem',
  })
  source_id?: string;

  @ApiPropertyOptional({
    description: 'Tipo de contraparte',
    example: 'customer',
  })
  counterpart_type?: string;

  @ApiPropertyOptional({
    description: 'ID da contraparte',
  })
  counterpart_id?: string;

  @ApiPropertyOptional({
    description: 'Status do lançamento',
    enum: ['pending', 'confirmed', 'reconciled'],
    example: 'pending',
  })
  status?: 'pending' | 'confirmed' | 'reconciled';
}
