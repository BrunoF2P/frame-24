import { createZodDto } from 'nestjs-zod';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UpdateMovieCategorySchema } from './update-movie-category.schema';

export class UpdateMovieCategoryDto extends createZodDto(
  UpdateMovieCategorySchema,
) {
  @ApiPropertyOptional({ description: 'Nome da categoria' })
  name?: string;

  @ApiPropertyOptional({ description: 'Descrição da categoria' })
  description?: string;

  @ApiPropertyOptional({ description: 'Idade mínima recomendada' })
  minimum_age?: number;

  @ApiPropertyOptional({ description: 'Categoria ativa?' })
  active?: boolean;
}
