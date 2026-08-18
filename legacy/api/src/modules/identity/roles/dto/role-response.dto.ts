import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const RoleResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  is_system_role: z.boolean(),
  hierarchy_level: z.number().nullable(),
  permissions: z.array(z.string()),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export class RoleResponseDto extends createZodDto(RoleResponseSchema) {
  @ApiProperty({
    description: 'Role ID',
    example: '243244130367442946',
  })
  id!: string;

  @ApiProperty({
    description: 'Role name',
    example: 'Estagiário RH',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Role description',
    example: 'Estagiário do departamento de RH',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({
    description: 'Whether this is a system role (cannot be edited/deleted)',
    example: false,
  })
  is_system_role!: boolean;

  @ApiPropertyOptional({
    description: 'Hierarchy level (1 = highest, 100 = lowest)',
    example: 85,
    nullable: true,
  })
  hierarchy_level!: number | null;

  @ApiProperty({
    description: 'List of permission codes assigned to this role',
    example: ['users:read', 'users:create', 'reports:read'],
    type: [String],
  })
  permissions!: string[];

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-11-05T03:20:00.000Z',
  })
  created_at!: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-11-05T03:20:00.000Z',
  })
  updated_at!: string;
}
