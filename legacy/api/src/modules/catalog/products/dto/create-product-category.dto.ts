import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const CreateProductCategorySchema = z.object({
  name: z
    .string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  description: z
    .string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional(),
});

export class CreateProductCategoryDto extends createZodDto(
  CreateProductCategorySchema,
) {
  @ApiProperty({
    description: 'Nome da categoria',
    example: 'Bebidas',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Descrição da categoria',
    example: 'Refrigerantes, sucos e águas',
  })
  description?: string;
}
