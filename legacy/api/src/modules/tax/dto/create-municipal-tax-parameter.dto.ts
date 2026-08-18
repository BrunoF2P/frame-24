import { createZodDto } from 'nestjs-zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateMunicipalTaxParameterSchema } from './create-municipal-tax-parameter.schema';

export class CreateMunicipalTaxParameterDto extends createZodDto(
  CreateMunicipalTaxParameterSchema,
) {
  @ApiProperty({
    description: 'Código do município no IBGE',
    example: '3550308',
  })
  ibge_municipality_code!: string;

  @ApiProperty({
    description: 'Nome do município',
    example: 'São Paulo',
  })
  municipality_name!: string;

  @ApiProperty({
    description: 'UF do município (sigla)',
    example: 'SP',
  })
  state!: string;

  @ApiProperty({
    description: 'Alíquota do ISS em percentual',
    example: 5.0,
  })
  iss_rate!: number;

  @ApiPropertyOptional({
    description: 'Código de serviço do ISS',
    example: '14.01.01',
  })
  iss_service_code?: string;

  @ApiPropertyOptional({
    description: 'Indica se há concessão específica de ISS',
    default: false,
  })
  iss_concession_applicable?: boolean;

  @ApiPropertyOptional({
    description: 'Código de serviço para concessão de ISS',
    example: '14.02.01',
  })
  iss_concession_service_code?: string;

  @ApiPropertyOptional({
    description: 'Indica se o ISS é retido na fonte',
    default: false,
  })
  iss_withholding?: boolean;

  @ApiProperty({
    description: 'Data de início da vigência (ISO 8601)',
    example: '2025-01-01T00:00:00.000Z',
  })
  validity_start!: Date;

  @ApiPropertyOptional({
    description: 'Data de fim da vigência (ISO 8601)',
    example: '2025-12-31T23:59:59.999Z',
  })
  validity_end!: Date;

  @ApiPropertyOptional({
    description: 'Notas adicionais sobre a parametrização',
    example: 'Parâmetro inicial cadastrado pela equipe fiscal.',
  })
  notes?: string;

  @ApiPropertyOptional({
    description: 'Define se o parâmetro está ativo',
    default: true,
  })
  active?: boolean;
}
