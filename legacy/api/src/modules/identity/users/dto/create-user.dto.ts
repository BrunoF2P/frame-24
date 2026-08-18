import { createZodDto } from 'nestjs-zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateUserSchema } from 'src/modules/identity/users/dto/user-schemas';

export class CreateUserDto extends createZodDto(CreateUserSchema) {
  @ApiProperty({
    description: 'Nome completo do usuário',
    example: 'João da Silva Santos',
  })
  full_name!: string;

  @ApiPropertyOptional({
    description: 'CPF (com ou sem formatação)',
    example: '123.456.789-00',
  })
  cpf?: string;

  @ApiPropertyOptional({
    description: 'Data de nascimento (ISO 8601)',
    example: '1990-05-15T00:00:00.000Z',
  })
  birth_date?: string;

  @ApiPropertyOptional({
    description: 'Telefone fixo',
    example: '(11) 3000-0000',
  })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Celular',
    example: '(11) 98765-4321',
  })
  mobile?: string;

  @ApiProperty({
    description: 'Email (será usado para login)',
    example: 'joao.silva@empresa.com',
  })
  email!: string;

  @ApiPropertyOptional({
    description: 'CEP',
    example: '01310-100',
  })
  zip_code?: string;

  @ApiPropertyOptional({
    description: 'Endereço (rua)',
    example: 'Av. Paulista',
  })
  street_address?: string;

  @ApiPropertyOptional({
    description: 'Número',
    example: '1578',
  })
  address_number?: string;

  @ApiPropertyOptional({
    description: 'Complemento',
    example: 'Sala 501',
  })
  address_complement?: string;

  @ApiPropertyOptional({
    description: 'Bairro',
    example: 'Bela Vista',
  })
  neighborhood?: string;

  @ApiPropertyOptional({
    description: 'Cidade',
    example: 'São Paulo',
  })
  city?: string;

  @ApiPropertyOptional({
    description: 'Estado (UF)',
    example: 'SP',
  })
  state?: string;

  @ApiProperty({
    description: 'País (código ISO)',
    example: 'BR',
    default: 'BR',
  })
  country!: string;

  @ApiProperty({
    description: 'Senha (mín. 8 caracteres, maiúscula, minúscula e número)',
    example: 'SenhaForte123',
  })
  password!: string;

  @ApiProperty({
    description: 'ID da role',
    example: '243254863696236545',
  })
  role_id!: string;

  @ApiPropertyOptional({
    description: 'Departamento',
    example: 'TI',
  })
  department?: string;

  @ApiPropertyOptional({
    description: 'Cargo/nível',
    example: 'Desenvolvedor Senior',
  })
  job_level?: string;

  @ApiPropertyOptional({
    description: 'Localização/unidade',
    example: 'Matriz - São Paulo',
  })
  location?: string;

  @ApiPropertyOptional({
    description: 'IDs dos complexos permitidos',
    example: ['COMPLEX-001', 'COMPLEX-005'],
    type: [String],
  })
  allowed_complexes?: string[];

  @ApiPropertyOptional({
    description: 'Lista de IPs permitidos',
    example: ['192.168.1.100', '10.0.0.50'],
    type: [String],
  })
  ip_whitelist?: string[];

  @ApiPropertyOptional({
    description: 'Data de início do vínculo (ISO 8601)',
    example: '2024-01-15T00:00:00.000Z',
  })
  start_date?: string;

  @ApiPropertyOptional({
    description: 'Data de término do vínculo (ISO 8601)',
    example: '2025-12-31T00:00:00.000Z',
  })
  end_date?: string;

  @ApiProperty({
    description: 'Status do usuário',
    example: true,
    default: true,
  })
  active!: boolean;
}
