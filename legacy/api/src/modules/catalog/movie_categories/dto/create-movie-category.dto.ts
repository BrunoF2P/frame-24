import { createZodDto } from 'nestjs-zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateMovieCategorySchema } from './create-movie-category.schema';

export class CreateMovieCategoryDto extends createZodDto(
  CreateMovieCategorySchema,
) {
  @ApiProperty({ description: 'Nome da categoria', example: 'Ação' })
  name!: string;

  @ApiPropertyOptional({ description: 'Descrição da categoria' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Idade mínima recomendada',
    example: 0,
    default: 0,
  })
  minimum_age?: number;

  @ApiPropertyOptional({
    description: 'Categoria ativa?',
    example: true,
    default: true,
  })
  active?: boolean;
}
