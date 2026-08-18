import { createZodDto } from 'nestjs-zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { tax_regime_type } from '@repo/db';
import { CreateCompanySchema } from 'src/modules/identity/companies/dto/company.schema';

export class CreateCompanyDto extends createZodDto(CreateCompanySchema) {
  @ApiProperty({
    description: 'CNPJ da empresa',
    example: '12.345.678/0001-99',
  })
  cnpj!: string;

  @ApiProperty({
    description: 'Razão Social da empresa',
    example: 'CineFrame Entretenimento LTDA',
  })
  corporate_name!: string;

  @ApiPropertyOptional({
    description: 'Regime tributário',
    enum: tax_regime_type,
    example: 'LUCRO_PRESUMIDO',
  })
  tax_regime?: tax_regime_type;

  @ApiPropertyOptional({
    description: 'Nome fantasia',
    example: 'CineFrame Cinemas',
  })
  trade_name?: string;

  @ApiPropertyOptional({
    description: 'Inscrição estadual',
    example: '123.456.789.000',
  })
  state_registration?: string;

  @ApiPropertyOptional({
    description: 'Inscrição municipal',
    example: '987.654.321.000',
  })
  municipal_registration?: string;

  @ApiPropertyOptional({
    description: 'Optante pelo RECINE',
    example: true,
  })
  recine_opt_in?: boolean;

  @ApiPropertyOptional({
    description: 'Data de adesão ao RECINE',
    example: '2025-05-10T00:00:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  recine_join_date?: string;

  @ApiPropertyOptional({
    description: 'URL da logomarca',
    example: 'https://cdn.example.com/logo.png',
  })
  logo_url?: string;

  @ApiPropertyOptional({
    description: 'Máximo de complexos',
    example: 10,
  })
  max_complexes?: number;

  @ApiPropertyOptional({
    description: 'Máximo de colaboradores',
    example: 100,
  })
  max_employees?: number;

  @ApiPropertyOptional({
    description: 'Limite de armazenamento em GB',
    example: 50,
  })
  max_storage_gb?: number;

  @ApiPropertyOptional({
    description: 'Tipo de plano',
    enum: ['BASIC', 'PREMIUM', 'ENTERPRISE'],
    example: 'PREMIUM',
  })
  plan_type?: 'BASIC' | 'PREMIUM' | 'ENTERPRISE';

  @ApiPropertyOptional({
    description: 'Data de expiração do plano',
    example: '2026-11-01T00:00:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  plan_expires_at?: string;

  @ApiPropertyOptional({
    description: 'CEP',
    example: '01310-100',
  })
  zip_code?: string;

  @ApiPropertyOptional({
    description: 'Logradouro',
    example: 'Av. Paulista',
  })
  street_address?: string;

  @ApiPropertyOptional({
    description: 'Número do endereço',
    example: '1578',
  })
  address_number?: string;

  @ApiPropertyOptional({
    description: 'Telefone fixo',
    example: '(11) 3333-4444',
  })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Celular',
    example: '(11) 99999-9999',
  })
  mobile?: string;

  @ApiPropertyOptional({
    description: 'E-mail corporativo',
    example: 'contato@empresa.com.br',
  })
  email?: string;

  @ApiPropertyOptional({
    description: 'Website',
    example: 'https://www.empresa.com.br',
  })
  website?: string;
}
