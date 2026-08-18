import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const UpdateProductSchema = z.object({
  category_id: z.string().optional(),
  product_code: z.string().max(50, 'Código do produto muito longo').optional(),
  name: z
    .string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(200, 'Nome deve ter no máximo 200 caracteres')
    .optional(),
  description: z
    .string()
    .max(1000, 'Descrição deve ter no máximo 1000 caracteres')
    .optional(),
  image_url: z
    .string()
    .url('URL da imagem inválida')
    .max(500, 'URL da imagem muito longa')
    .optional()
    .nullable(),
  ncm_code: z.string().max(10, 'Código NCM inválido').optional(),
  unit: z
    .string()
    .max(10, 'Unidade deve ter no máximo 10 caracteres')
    .optional(),
  minimum_stock: z
    .number()
    .int('Estoque deve ser um número inteiro')
    .min(0, 'Estoque não pode ser negativo')
    .optional(),
  supplier_id: z.string().optional().nullable(),
  barcode: z
    .string()
    .max(50, 'Código de barras muito longo')
    .optional()
    .nullable(),
  is_available_online: z.boolean().optional(),
  active: z.boolean().optional(),
});

export class UpdateProductDto extends createZodDto(UpdateProductSchema) {
  @ApiPropertyOptional({
    description: 'ID da categoria',
  })
  category_id?: string;

  @ApiPropertyOptional({
    description: 'Código do produto (pode editar)',
    example: 'BEB-0001',
  })
  product_code?: string; // ✅ Adicionar

  @ApiPropertyOptional({
    description: 'Nome do produto',
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'Descrição do produto',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'URL da imagem',
  })
  image_url?: string | null;

  @ApiPropertyOptional({
    description: 'Código NCM',
  })
  ncm_code?: string;

  @ApiPropertyOptional({
    description: 'Unidade de medida',
  })
  unit?: string;

  @ApiPropertyOptional({
    description: 'Estoque mínimo',
  })
  minimum_stock?: number;

  @ApiPropertyOptional({
    description: 'ID do fornecedor',
  })
  supplier_id?: string | null;

  @ApiPropertyOptional({
    description: 'Código de barras',
  })
  barcode?: string | null;

  @ApiPropertyOptional({
    description: 'Disponível online',
  })
  is_available_online?: boolean;

  @ApiPropertyOptional({
    description: 'Ativo',
  })
  active?: boolean;
}
