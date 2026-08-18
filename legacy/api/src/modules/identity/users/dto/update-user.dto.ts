import { createZodDto } from 'nestjs-zod';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UpdateUserSchema } from 'src/modules/identity/users/dto/user-schemas';

export class UpdateUserDto extends createZodDto(UpdateUserSchema) {
  @ApiPropertyOptional({
    description: 'Nome completo',
    example: 'João da Silva Santos',
  })
  full_name?: string;

  @ApiPropertyOptional({
    description: 'CPF',
    example: '123.456.789-00',
  })
  cpf?: string;

  @ApiPropertyOptional({
    description: 'Data de nascimento',
    example: '1990-05-15T00:00:00.000Z',
  })
  birth_date?: string;

  @ApiPropertyOptional({
    description: 'Telefone',
    example: '(11) 3000-0000',
  })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Celular',
    example: '(11) 98765-4321',
  })
  mobile?: string;

  @ApiPropertyOptional({
    description: 'Email',
    example: 'joao.silva@empresa.com',
  })
  email?: string;

  @ApiPropertyOptional({
    description: 'CEP',
    example: '01310-100',
  })
  zip_code?: string;

  @ApiPropertyOptional({
    description: 'Endereço',
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

  @ApiPropertyOptional({
    description: 'País',
    example: 'BR',
  })
  country?: string;

  @ApiPropertyOptional({
    description: 'ID da role',
    example: '243254863696236545',
  })
  role_id?: string;

  @ApiPropertyOptional({
    description: 'Departamento',
    example: 'Vendas',
  })
  department?: string;

  @ApiPropertyOptional({
    description: 'Cargo/nível',
    example: 'Gerente',
  })
  job_level?: string;

  @ApiPropertyOptional({
    description: 'Localização',
    example: 'Filial RJ',
  })
  location?: string;

  @ApiPropertyOptional({
    description: 'Complexos permitidos',
    example: ['COMPLEX-001'],
    type: [String],
  })
  allowed_complexes?: string[];

  @ApiPropertyOptional({
    description: 'IPs permitidos',
    example: ['192.168.1.100'],
    type: [String],
  })
  ip_whitelist?: string[];

  @ApiPropertyOptional({
    description: 'Status',
    example: true,
  })
  active?: boolean;

  @ApiPropertyOptional({
    description: 'Data de início',
    example: '2024-01-15T00:00:00.000Z',
  })
  start_date?: string;

  @ApiPropertyOptional({
    description: 'Data de término',
    example: '2025-12-31T00:00:00.000Z',
    nullable: true,
  })
  end_date?: string | null;
}
