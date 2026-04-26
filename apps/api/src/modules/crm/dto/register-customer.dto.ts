import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const RegisterCustomerSchema = z
  .object({
    company_id: z.string().min(1).optional(),
    tenant_slug: z.string().min(1).optional(),
    cpf: z.string().regex(/^\d{11}$/, 'CPF deve conter 11 dígitos numéricos'),
    full_name: z
      .string()
      .min(3, 'Nome deve ter no mínimo 3 caracteres')
      .max(200, 'Nome deve ter no máximo 200 caracteres'),
    email: z.string().email('Email inválido'),
    phone: z.string().optional(),
    birth_date: z.string().optional(),
    password: z
      .string()
      .min(8, 'Senha deve ter no mínimo 8 caracteres')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Senha deve conter maiúscula, minúscula e número',
      ),
    accepts_marketing: z.boolean().default(false).optional(),
    accepts_email: z.boolean().default(true).optional(),
    accepts_sms: z.boolean().default(false).optional(),
  })
  .refine((data) => data.company_id || data.tenant_slug, {
    message: 'Empresa ou tenant é obrigatório',
    path: ['company_id'],
  });

export class RegisterCustomerDto extends createZodDto(RegisterCustomerSchema) {
  @ApiProperty({
    description: 'ID da empresa',
    example: '243244130367442946',
  })
  company_id?: string;

  @ApiPropertyOptional({
    description: 'Slug do tenant',
    example: 'cine-frame-0195',
  })
  tenant_slug?: string;

  @ApiProperty({
    description: 'CPF do cliente',
    example: '123.456.789-00',
  })
  cpf!: string;

  @ApiProperty({
    description: 'Nome completo',
    example: 'João Silva',
  })
  full_name!: string;

  @ApiProperty({
    description: 'Email',
    example: 'joao@example.com',
  })
  email!: string;

  @ApiPropertyOptional({
    description: 'Telefone',
    example: '(11) 99999-9999',
  })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Data de nascimento',
    example: '1990-01-01',
  })
  birth_date?: string;

  @ApiProperty({
    description: 'Senha (mín. 8 caracteres, maiúscula, minúscula e número)',
    example: 'SenhaSegura123',
    minLength: 8,
  })
  password!: string;

  @ApiPropertyOptional({
    description: 'Aceita marketing',
    default: false,
  })
  accepts_marketing?: boolean;

  @ApiPropertyOptional({
    description: 'Aceita emails',
    default: true,
  })
  accepts_email?: boolean;

  @ApiPropertyOptional({
    description: 'Aceita SMS',
    default: false,
  })
  accepts_sms?: boolean;
}
