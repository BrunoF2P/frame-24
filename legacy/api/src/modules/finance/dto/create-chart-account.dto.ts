import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const CreateChartAccountSchema = z.object({
  account_code: z
    .string()
    .min(1, 'Código da conta é obrigatório')
    .max(20, 'Código da conta deve ter no máximo 20 caracteres'),
  account_name: z
    .string()
    .min(1, 'Nome da conta é obrigatório')
    .max(200, 'Nome da conta deve ter no máximo 200 caracteres'),
  account_type: z.string().optional(),
  account_nature: z.string().optional(),
  parent_account_id: z.string().optional(),
  allows_entry: z.boolean().optional(),
});

export class CreateChartAccountDto extends createZodDto(
  CreateChartAccountSchema,
) {
  @ApiProperty({
    description: 'Código único da conta contábil',
    example: '1.1.1.01',
  })
  account_code!: string;

  @ApiProperty({
    description: 'Nome da conta contábil',
    example: 'Caixa Geral',
  })
  account_name!: string;

  @ApiPropertyOptional({
    description: 'Tipo da conta (Ativo, Passivo, etc)',
    example: 'Ativo',
  })
  account_type?: string;

  @ApiPropertyOptional({
    description: 'Natureza da conta (Devedor/Credor)',
    example: 'Devedor',
  })
  account_nature?: string;

  @ApiPropertyOptional({
    description: 'ID da conta pai, se houver',
  })
  parent_account_id?: string;

  @ApiPropertyOptional({
    description: 'Indica se permite lançamentos diretamente nesta conta',
    default: true,
  })
  allows_entry?: boolean;
}

export class UpdateChartAccountDto extends createZodDto(
  CreateChartAccountSchema.partial(),
) {}
