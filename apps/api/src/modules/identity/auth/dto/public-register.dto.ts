import { createZodDto } from 'nestjs-zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

const planTypeEnum = z.enum(['BASIC', 'PREMIUM', 'ENTERPRISE']);

const optionalTrimmedString = (maxLength: number) =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }, z.string().max(maxLength).optional());

export const PublicRegisterSchema = z.object({
  corporate_name: z
    .string()
    .trim()
    .min(3, 'Razão social é obrigatória')
    .max(200, 'Razão social deve ter no máximo 200 caracteres'),
  trade_name: optionalTrimmedString(200),
  cnpj: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, ''))
    .pipe(z.string().regex(/^\d{14}$/, 'CNPJ deve conter 14 dígitos')),

  company_zip_code: optionalTrimmedString(10),
  company_street_address: optionalTrimmedString(300),
  company_address_number: optionalTrimmedString(20),
  company_address_complement: optionalTrimmedString(100),
  company_neighborhood: optionalTrimmedString(100),
  company_city: optionalTrimmedString(100),
  company_state: z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const normalized = value.trim().toUpperCase();
    return normalized.length === 0 ? undefined : normalized;
  }, z.string().length(2, 'UF deve ter 2 caracteres').optional()),
  company_phone: optionalTrimmedString(20),
  company_email: z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const normalized = value.trim().toLowerCase();
    return normalized.length === 0 ? undefined : normalized;
  }, z.string().email('Email da empresa inválido').optional()),

  full_name: z
    .string()
    .trim()
    .min(3, 'Nome completo é obrigatório')
    .max(200, 'Nome completo deve ter no máximo 200 caracteres'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Email do administrador inválido'),
  password: z
    .string()
    .trim()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Senha deve conter maiúscula, minúscula e número',
    ),
  mobile: optionalTrimmedString(20),
  plan_type: planTypeEnum.default('BASIC').optional(),
});

export class PublicRegisterDto extends createZodDto(PublicRegisterSchema) {
  @ApiProperty({ example: 'Cine Frame LTDA' })
  corporate_name!: string;

  @ApiPropertyOptional({ example: 'Cine Frame' })
  trade_name?: string;

  @ApiProperty({ example: '12345678000195' })
  cnpj!: string;

  @ApiPropertyOptional({ example: '01310100' })
  company_zip_code?: string;

  @ApiPropertyOptional({ example: 'Av. Paulista' })
  company_street_address?: string;

  @ApiPropertyOptional({ example: '1578' })
  company_address_number?: string;

  @ApiPropertyOptional({ example: 'Conjunto 901' })
  company_address_complement?: string;

  @ApiPropertyOptional({ example: 'Bela Vista' })
  company_neighborhood?: string;

  @ApiPropertyOptional({ example: 'Sao Paulo' })
  company_city?: string;

  @ApiPropertyOptional({ example: 'SP' })
  company_state?: string;

  @ApiPropertyOptional({ example: '1133334444' })
  company_phone?: string;

  @ApiPropertyOptional({ example: 'contato@cineframe.com.br' })
  company_email?: string;

  @ApiProperty({ example: 'Maria Souza' })
  full_name!: string;

  @ApiProperty({ example: 'maria@cineframe.com.br' })
  email!: string;

  @ApiProperty({ example: 'SenhaForte123' })
  password!: string;

  @ApiPropertyOptional({ example: '11999998888' })
  mobile?: string;

  @ApiPropertyOptional({ enum: ['BASIC', 'PREMIUM', 'ENTERPRISE'] })
  plan_type?: 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
}

export class PublicRegisterResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Cadastro realizado com sucesso.' })
  message!: string;

  @ApiProperty({ example: '9d3b4d5e-2ff0-4a56-9db3-9f11c443e0f0' })
  company_id!: string;

  @ApiProperty({ example: 'cine-frame-0195' })
  tenant_slug!: string;

  @ApiProperty({ example: 'maria@cineframe.com.br' })
  email!: string;
}
