import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const CreateDistributorSettlementSchema = z.object({
  contract_id: z.string().min(1, 'Contrato é obrigatório'),
  distributor_id: z.string().min(1, 'Distribuidor é obrigatório'),
  cinema_complex_id: z.string().min(1, 'Complexo de cinema é obrigatório'),
  competence_start_date: z.string().min(1, 'Data inicial é obrigatória'),
  competence_end_date: z.string().min(1, 'Data final é obrigatória'),
  gross_box_office_revenue: z
    .number()
    .nonnegative('Receita bruta não pode ser negativa'),
  distributor_percentage: z
    .number()
    .min(0, 'Porcentagem do distribuidor não pode ser negativa')
    .max(100, 'Porcentagem do distribuidor não pode ser maior que 100'),
  taxes_deducted_amount: z
    .number()
    .nonnegative('Impostos retidos não podem ser negativos')
    .optional(),
  deductions_amount: z
    .number()
    .nonnegative('Deduções não podem ser negativas')
    .optional(),
  notes: z.string().optional(),
});

export class CreateDistributorSettlementDto extends createZodDto(
  CreateDistributorSettlementSchema,
) {
  @ApiProperty({ description: 'ID do contrato de exibição' })
  contract_id!: string;

  @ApiProperty({ description: 'ID do distribuidor' })
  distributor_id!: string;

  @ApiProperty({ description: 'ID do complexo de cinema' })
  cinema_complex_id!: string;

  @ApiProperty({
    description: 'Data inicial da competência',
    example: '2025-11-01',
  })
  competence_start_date!: string;

  @ApiProperty({
    description: 'Data final da competência',
    example: '2025-11-30',
  })
  competence_end_date!: string;

  @ApiProperty({
    description: 'Receita bruta de bilheteria',
    example: 150000.5,
  })
  gross_box_office_revenue!: number;

  @ApiProperty({
    description: 'Percentual do distribuidor (0-100)',
    example: 50,
  })
  distributor_percentage!: number;

  @ApiPropertyOptional({
    description: 'Impostos retidos (ISS, IRRF, etc)',
    example: 1000,
  })
  taxes_deducted_amount?: number;

  @ApiPropertyOptional({
    description: 'Outras deduções aplicadas',
    example: 500,
  })
  deductions_amount?: number;

  @ApiPropertyOptional({
    description: 'Notas adicionais',
  })
  notes?: string;
}
