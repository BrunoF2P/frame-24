import { createZodDto } from 'nestjs-zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CinemaComplexSchema } from './cinema-complex.schema';

export class CreateCinemaComplexDto extends createZodDto(CinemaComplexSchema) {
  @ApiProperty({
    description: 'Nome do complexo de cinema.',
    example: 'Cineplex Ibirapuera',
  })
  name!: string;

  @ApiProperty({
    description: 'Código único para o complexo.',
    example: 'IBIRAPUERA-01',
  })
  code!: string;

  @ApiPropertyOptional({
    description: 'CNPJ do complexo.',
    example: '12.345.678/0001-90',
  })
  cnpj?: string;

  @ApiPropertyOptional({
    description: 'Endereço completo do cinema.',
    example: 'Av. Ibirapuera, 3103',
  })
  address?: string;

  @ApiPropertyOptional({
    description: 'Cidade onde o complexo está localizado.',
    example: 'São Paulo',
  })
  city?: string;

  @ApiPropertyOptional({ description: 'Estado (UF).', example: 'SP' })
  state?: string;

  @ApiPropertyOptional({
    description: 'Código Postal (CEP).',
    example: '04543-011',
  })
  postal_code?: string;

  @ApiProperty({
    description: 'Código do município no IBGE.',
    example: '3550308',
  })
  ibge_municipality_code!: string;

  @ApiPropertyOptional({
    description: 'Registro do complexo na ANCINE.',
    example: '123456789',
  })
  ancine_registry?: string;

  @ApiPropertyOptional({
    description: 'Data de inauguração (ISO 8601)',
    type: String,
    example: '2023-10-27T00:00:00.000Z',
  })
  opening_date?: string;

  @ApiPropertyOptional({
    description: 'Indica se o complexo está ativo.',
    default: true,
  })
  active?: boolean;
}
