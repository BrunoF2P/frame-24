import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const CreateRoleSchema = z.object({
  name: z
    .string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(50, 'Nome deve ter no máximo 50 caracteres'),
  description: z
    .string()
    .max(255, 'Descrição deve ter no máximo 255 caracteres')
    .optional(),
  permissions: z
    .array(z.string())
    .min(1, 'Pelo menos uma permissão é necessária'),
  hierarchy_level: z
    .number()
    .int('Nível hierárquico deve ser inteiro')
    .min(1, 'Nível mínimo é 1')
    .max(100, 'Nível máximo é 100')
    .optional(),
});

export class CreateRoleDto extends createZodDto(CreateRoleSchema) {
  @ApiProperty({
    description: 'Role name',
    example: 'Estagiário RH',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Role description',
    example: 'Estagiário do departamento de RH com permissão de cadastro',
  })
  description?: string;

  @ApiProperty({
    description:
      'List of permission codes (use GET /admin/permissions to list available)',
    example: ['users:read', 'users:create', 'reports:read'],
    type: [String],
  })
  permissions!: string[];

  @ApiPropertyOptional({
    description: 'Hierarchy level (1 = highest, 100 = lowest)',
    example: 85,
    minimum: 1,
    maximum: 100,
  })
  hierarchy_level?: number;
}
