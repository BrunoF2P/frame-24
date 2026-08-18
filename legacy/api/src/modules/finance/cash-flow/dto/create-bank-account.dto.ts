import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const CreateBankAccountSchema = z.object({
  bank_name: z.string().min(1).max(100),
  bank_code: z.string().max(10).optional(),
  agency: z.string().min(1).max(20),
  agency_digit: z.string().max(2).optional(),
  account_number: z.string().min(1).max(20),
  account_digit: z.string().max(2).optional(),
  account_type: z.enum(['checking', 'savings', 'investment']),
  initial_balance: z.number().optional(),
  description: z.string().optional(),
});

export class CreateBankAccountDto extends createZodDto(
  CreateBankAccountSchema,
) {
  @ApiProperty({
    description: 'Nome do banco',
    example: 'Banco do Brasil',
  })
  bank_name!: string;

  @ApiPropertyOptional({
    description: 'Código do banco',
    example: '001',
  })
  bank_code?: string;

  @ApiProperty({
    description: 'Número da agência',
    example: '1234',
  })
  agency!: string;

  @ApiPropertyOptional({
    description: 'Dígito da agência',
    example: '5',
  })
  agency_digit?: string;

  @ApiProperty({
    description: 'Número da conta',
    example: '12345678',
  })
  account_number!: string;

  @ApiPropertyOptional({
    description: 'Dígito da conta',
    example: '9',
  })
  account_digit?: string;

  @ApiProperty({
    description: 'Tipo de conta',
    enum: ['checking', 'savings', 'investment'],
    example: 'checking',
  })
  account_type!: 'checking' | 'savings' | 'investment';

  @ApiPropertyOptional({
    description: 'Saldo inicial',
    example: 10000.0,
  })
  initial_balance?: number;

  @ApiPropertyOptional({
    description: 'Descrição da conta',
    example: 'Conta corrente principal',
  })
  description?: string;
}
