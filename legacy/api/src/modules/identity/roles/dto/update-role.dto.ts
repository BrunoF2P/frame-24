import { createZodDto } from 'nestjs-zod';
import { CreateRoleSchema } from './create-role.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const UpdateRoleSchema = CreateRoleSchema.partial();

export class UpdateRoleDto extends createZodDto(UpdateRoleSchema) {
  @ApiPropertyOptional({
    description: 'Role name',
    example: 'Estagiário RH Sênior',
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'Role description',
    example: 'Estagiário sênior do RH',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'List of permission codes',
    example: ['users:read', 'users:create', 'users:update', 'reports:read'],
    type: [String],
  })
  permissions?: string[];

  @ApiPropertyOptional({
    description: 'Hierarchy level',
    example: 80,
    minimum: 1,
    maximum: 100,
  })
  hierarchy_level?: number;
}
