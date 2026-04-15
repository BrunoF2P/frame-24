import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const UpdateCustomerProfileSchema = z.object({
  full_name: z
    .string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(200, 'Nome deve ter no máximo 200 caracteres')
    .optional(),
  phone: z.string().optional(),
  birth_date: z.string().optional().nullable(),
  zip_code: z.string().max(10).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().length(2).optional().nullable(),
  accepts_email: z.boolean().optional(),
  accepts_sms: z.boolean().optional(),
  accepts_marketing: z.boolean().optional(),
});

export class UpdateCustomerProfileDto extends createZodDto(
  UpdateCustomerProfileSchema,
) {
  @ApiPropertyOptional({
    description: 'Nome completo do cliente',
    example: 'João da Silva',
  })
  full_name?: string;

  @ApiPropertyOptional({
    description: 'Telefone do cliente',
    example: '(11) 99999-9999',
  })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Data de nascimento (YYYY-MM-DD)',
    example: '1990-01-01',
  })
  birth_date?: string | null;

  @ApiPropertyOptional({
    description: 'CEP fiscal',
    example: '40000-000',
  })
  zip_code?: string | null;

  @ApiPropertyOptional({
    description: 'Endereço fiscal',
    example: 'Av. Sete de Setembro, 1000',
  })
  address?: string | null;

  @ApiPropertyOptional({
    description: 'Cidade fiscal',
    example: 'Salvador',
  })
  city?: string | null;

  @ApiPropertyOptional({
    description: 'UF fiscal',
    example: 'BA',
  })
  state?: string | null;

  @ApiPropertyOptional({
    description: 'Aceite de comunicação por e-mail',
    example: true,
  })
  accepts_email?: boolean;

  @ApiPropertyOptional({
    description: 'Aceite de comunicação por SMS',
    example: false,
  })
  accepts_sms?: boolean;

  @ApiPropertyOptional({
    description: 'Aceite de comunicação de marketing',
    example: true,
  })
  accepts_marketing?: boolean;
}
