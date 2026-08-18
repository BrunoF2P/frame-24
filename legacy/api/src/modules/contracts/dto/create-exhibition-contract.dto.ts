import { createZodDto } from 'nestjs-zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CreateExhibitionContractSchema,
  SlidingScaleItemInput,
} from './create-exhibition-contract.schema';

export class CreateExhibitionContractDto extends createZodDto(
  CreateExhibitionContractSchema,
) {
  @ApiProperty({ description: 'Filme relacionado ao contrato' })
  movie_id!: string;

  @ApiProperty({ description: 'Complexo onde o contrato é válido' })
  cinema_complex_id!: string;

  @ApiProperty({ description: 'Distribuidora responsável' })
  distributor_id!: string;

  @ApiPropertyOptional({
    description: 'Tipo de contrato (ex: Percentual Fixo)',
  })
  contract_type_id?: string | null;

  @ApiPropertyOptional({
    description: 'Base de cálculo para settlements',
  })
  settlement_base_id?: string | null;

  @ApiPropertyOptional({
    description: 'Número do contrato',
    maxLength: 50,
  })
  contract_number?: string | null;

  @ApiProperty({
    description: 'Data de início de vigência',
    type: 'string',
    format: 'date-time',
  })
  start_date!: Date;

  @ApiProperty({
    description: 'Data de término da vigência',
    type: 'string',
    format: 'date-time',
  })
  end_date!: Date;

  @ApiProperty({
    description: 'Percentual da distribuidora (%)',
    minimum: 0,
    maximum: 100,
  })
  distributor_percentage!: number;

  @ApiProperty({
    description: 'Percentual do exibidor (%)',
    minimum: 0,
    maximum: 100,
  })
  exhibitor_percentage!: number;

  @ApiPropertyOptional({
    description: 'Valor mínimo garantido',
    default: 0,
  })
  guaranteed_minimum?: number;

  @ApiPropertyOptional({
    description: 'Outros valores de garantia mínima',
    default: 0,
  })
  minimum_guarantee?: number;

  @ApiPropertyOptional({
    description: 'Termos do contrato',
  })
  contract_terms?: string;

  @ApiPropertyOptional({
    description: 'Observações adicionais',
  })
  notes?: string;

  @ApiPropertyOptional({
    description: 'Ativo?',
    default: true,
  })
  active?: boolean;

  @ApiPropertyOptional({
    description: 'Escala móvel por semana',
    type: 'array',
    example: [
      {
        week_number: 1,
        distributor_percentage: 55,
        exhibitor_percentage: 45,
      },
    ],
  })
  sliding_scale?: SlidingScaleItemInput[];
}
