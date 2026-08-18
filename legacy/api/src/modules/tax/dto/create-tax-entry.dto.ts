import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const CreateTaxEntrySchema = z.object({
  cinema_complex_id: z.string(),
  source_type: z.string().optional(),
  source_id: z.string().optional(),
  gross_amount: z.number().min(0),
  deductions_amount: z.number().min(0).optional(),
  competence_date: z
    .string()
    .refine((value) => !isNaN(Date.parse(value)), 'Formato de data inválido') // Valida se a string é uma data válida
    .transform((value) => {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Data inválida');
      }
      return date; // Retorna como um objeto Date
    }),
  revenue_type: z.string().optional(),
  pis_cofins_regime: z.string().optional(),
  apply_iss: z.boolean().default(true).optional(),
});

export class CreateTaxEntryDto extends createZodDto(CreateTaxEntrySchema) {
  @ApiProperty({
    description: 'ID do complexo de cinema',
    example: '243244130367442946',
  })
  cinema_complex_id!: string;

  @ApiPropertyOptional({
    description: 'Tipo de origem (ex: SALE, CONCESSION)',
    example: 'SALE',
  })
  source_type?: string;

  @ApiPropertyOptional({
    description: 'ID da origem',
    example: '243244130367442999',
  })
  source_id?: string;

  @ApiProperty({
    description: 'Valor bruto',
    example: 1000.0,
  })
  gross_amount!: number;

  @ApiPropertyOptional({
    description: 'Valor das deduções',
    example: 100.0,
    default: 0,
  })
  deductions_amount?: number;

  @ApiProperty({
    description: 'Data de competência',
    example: '2025-01-15',
  })
  competence_date!: Date;

  @ApiPropertyOptional({
    description: 'Tipo de receita',
    example: 'BOX_OFFICE',
  })
  revenue_type?: string;

  @ApiPropertyOptional({
    description: 'Regime PIS/COFINS',
    example: 'Não Cumulativo',
  })
  pis_cofins_regime?: string;

  @ApiPropertyOptional({
    description: 'Aplicar ISS',
    example: true,
    default: true,
  })
  apply_iss?: boolean;
}
