import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const ProductCategoryResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  product_count: z.number().optional(),
});

export class ProductCategoryResponseDto extends createZodDto(
  ProductCategoryResponseSchema,
) {
  @ApiProperty({
    description: 'ID da categoria',
    example: '243244130367442946',
  })
  id!: string;

  @ApiProperty({
    description: 'Nome da categoria',
    example: 'Bebidas',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Descrição da categoria',
    example: 'Refrigerantes, sucos e águas',
    nullable: true,
  })
  description!: string | null;

  @ApiPropertyOptional({
    description: 'Quantidade de produtos nesta categoria',
    example: 15,
  })
  product_count?: number;
}
