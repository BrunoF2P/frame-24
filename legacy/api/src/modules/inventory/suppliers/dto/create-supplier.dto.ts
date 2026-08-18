import { createZodDto } from 'nestjs-zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateSupplierSchema } from './create-supplier.schema';

export class CreateSupplierDto extends createZodDto(CreateSupplierSchema) {
  @ApiProperty({
    description: 'Nome jurídico do fornecedor (razão social)',
    example: 'Paris Filmes LTDA',
  })
  corporate_name!: string;

  @ApiPropertyOptional({
    description: 'Nome fantasia (como o fornecedor é conhecido comercialmente)',
    example: 'Paris Filmes',
  })
  trade_name?: string;

  @ApiProperty({
    description: 'CNPJ do fornecedor, apenas números',
    example: '12345678000190',
  })
  cnpj!: string;

  @ApiProperty({
    description: 'Telefone principal do fornecedor (DDD + número)',
    example: '1133345566',
  })
  phone!: string;

  @ApiPropertyOptional({
    description: 'Email de contato principal do fornecedor',
    example: 'contato@parisfilmes.com',
  })
  email?: string;

  @ApiPropertyOptional({
    description: 'Endereço comercial completo',
    example: 'Av. Paulista, 1000 - São Paulo/SP',
  })
  address?: string;

  @ApiPropertyOptional({
    description: 'Nome do responsável ou pessoa de contato',
    example: 'João Silva',
  })
  contact_name?: string;

  @ApiPropertyOptional({
    description: 'Telefone do contato (DDD + número)',
    example: '11987654321',
  })
  contact_phone?: string;

  @ApiPropertyOptional({
    description: 'Dias médios para entrega',
    example: 7,
    default: 7,
  })
  delivery_days?: number;

  @ApiPropertyOptional({
    description: 'Indica se o fornecedor atua como distribuidor de filmes',
    example: true,
    default: false,
  })
  is_film_distributor?: boolean;

  @ApiPropertyOptional({
    description: 'Identificador do tipo de fornecedor (chave estrangeira)',
    example: '212121323242442',
  })
  supplier_type_id?: string;

  @ApiPropertyOptional({
    description: 'Status do fornecedor',
    example: true,
    default: true,
  })
  active?: boolean;
}
