import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const UserResponseSchema = z.object({
  employee_id: z.string(),
  full_name: z.string(),
  email: z.string().email(),
  cpf: z.string().nullable(),
  mobile: z.string().nullable(),
  company_user: z.object({
    id: z.string(),
    employee_id: z.string(),
    role_id: z.string(),
    role_name: z.string(),
    department: z.string().nullable(),
    job_level: z.string().nullable(),
    active: z.boolean(),
    start_date: z.string(),
    end_date: z.string().nullable(),
    last_access: z.string().nullable(),
  }),
  created_at: z.string(),
  updated_at: z.string(),
});

export class UserResponseDto extends createZodDto(UserResponseSchema) {
  @ApiProperty({
    description: 'ID do funcionário',
    example: 'CE-0001',
  })
  employee_id!: string;

  @ApiProperty({
    description: 'Nome completo',
    example: 'João da Silva Santos',
  })
  full_name!: string;

  @ApiProperty({
    description: 'Email',
    example: 'joao.silva@empresa.com',
  })
  email!: string;

  @ApiPropertyOptional({
    description: 'CPF',
    example: '12345678900',
    nullable: true,
  })
  cpf!: string | null;

  @ApiPropertyOptional({
    description: 'Celular',
    example: '11987654321',
    nullable: true,
  })
  mobile!: string | null;

  @ApiProperty({
    description: 'Vínculo com a empresa',
  })
  company_user!: {
    id: string;
    employee_id: string;
    role_id: string;
    role_name: string;
    department: string | null;
    job_level: string | null;
    active: boolean;
    start_date: string;
    end_date: string | null;
    last_access: string | null;
  };

  @ApiProperty({
    description: 'Data de criação',
    example: '2024-01-15T10:00:00.000Z',
  })
  created_at!: string;

  @ApiProperty({
    description: 'Data de atualização',
    example: '2025-11-04T15:30:00.000Z',
  })
  updated_at!: string;
}
