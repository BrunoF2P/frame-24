import { createZodDto } from 'nestjs-zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateFederalTaxRateSchema } from './create-federal-tax-rate.schema';

export class CreateFederalTaxRateDto extends createZodDto(
  CreateFederalTaxRateSchema,
) {
  @ApiPropertyOptional({
    description: 'Regime tributário aplicável (ex: LUCRO_PRESUMIDO)',
  })
  tax_regime?: string;

  @ApiPropertyOptional({
    description: 'Regime de PIS/COFINS (ex: Não Cumulativo)',
  })
  pis_cofins_regime?: string;

  @ApiPropertyOptional({
    description: 'Tipo de receita (Bilheteria, Concessão, etc.)',
  })
  revenue_type?: string;

  @ApiProperty({
    description: 'Alíquota de PIS (%)',
    example: 1.65,
  })
  pis_rate!: number;

  @ApiProperty({
    description: 'Alíquota de COFINS (%)',
    example: 7.6,
  })
  cofins_rate!: number;

  @ApiPropertyOptional({
    description: 'Indica se créditos são permitidos',
    default: false,
  })
  credit_allowed?: boolean;

  @ApiPropertyOptional({
    description: 'Alíquota base de IRPJ (%)',
  })
  irpj_base_rate?: number;

  @ApiPropertyOptional({
    description: 'Alíquota adicional de IRPJ (%)',
  })
  irpj_additional_rate?: number;

  @ApiPropertyOptional({
    description: 'Limite para aplicação da alíquota adicional de IRPJ',
  })
  irpj_additional_limit?: number;

  @ApiPropertyOptional({
    description: 'Alíquota de CSLL (%)',
  })
  csll_rate?: number;

  @ApiPropertyOptional({
    description: 'Percentual de lucro presumido (%)',
  })
  presumed_profit_percentage?: number;

  @ApiProperty({
    description: 'Início da vigência',
    example: '2025-01-01T00:00:00.000Z',
  })
  validity_start!: Date;

  @ApiPropertyOptional({
    description: 'Fim da vigência',
    example: '2025-12-31T23:59:59.999Z',
  })
  validity_end!: Date;

  @ApiPropertyOptional({
    description: 'Define se o registro está ativo',
    default: true,
  })
  active?: boolean;
}
