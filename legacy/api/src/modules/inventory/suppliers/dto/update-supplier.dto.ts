import { createZodDto } from 'nestjs-zod';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UpdateSupplierSchema } from './update-supplier.schema';

export class UpdateSupplierDto extends createZodDto(UpdateSupplierSchema) {
  @ApiPropertyOptional({
    description: 'Razão social (opcional para atualização parcial)',
    example: 'Paris Filmes Distribuidora LTDA',
  })
  corporate_name?: string;

  @ApiPropertyOptional({
    description: 'Nome fantasia (opcional)',
    example: 'Paris Filmes',
  })
  trade_name?: string;

  @ApiPropertyOptional({
    description: 'CNPJ (somente se for atualizado)',
    example: '12345678000190',
  })
  cnpj?: string;

  @ApiPropertyOptional({
    description: 'Telefone atualizado do fornecedor',
    example: '1133345566',
  })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Email de contato atualizado',
    example: 'contato@parisfilmes.com',
  })
  email?: string;

  @ApiPropertyOptional({
    description: 'Endereço comercial atualizado',
    example: 'Av. Paulista, 1500 - SP',
  })
  address?: string;

  @ApiPropertyOptional({
    description: 'Nome do contato atualizado',
    example: 'Carla Oliveira',
  })
  contact_name?: string;

  @ApiPropertyOptional({
    description: 'Telefone de contato atualizado',
    example: '11999998888',
  })
  contact_phone?: string;

  @ApiPropertyOptional({
    description: 'Dias médios de entrega atualizados',
    example: 5,
  })
  delivery_days?: number;

  @ApiPropertyOptional({
    description: 'Atualiza flag de distribuidor de filmes',
    example: true,
  })
  is_film_distributor?: boolean;

  @ApiPropertyOptional({
    description: 'Atualiza o tipo de fornecedor (UUID)',
    example: 'b13fd2a1-8b7f-4b33-8a91-7a3a72b1329e',
  })
  supplier_type_id?: string;

  @ApiPropertyOptional({
    description: 'Ativa ou desativa o fornecedor',
    example: false,
  })
  active?: boolean;
}
