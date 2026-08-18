import { createZodDto } from 'nestjs-zod';
import { CreateProductCategorySchema } from './create-product-category.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const UpdateProductCategorySchema =
  CreateProductCategorySchema.partial();

export class UpdateProductCategoryDto extends createZodDto(
  UpdateProductCategorySchema,
) {
  @ApiPropertyOptional({
    description: 'Nome da categoria',
    example: 'Bebidas Geladas',
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'Descrição da categoria',
    example: 'Refrigerantes, sucos e águas geladas',
  })
  description?: string;
}
