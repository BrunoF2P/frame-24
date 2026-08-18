import { createZodDto } from 'nestjs-zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CastItemInput,
  CreateMovieSchema,
  MediaItemInput,
} from './create-movie.schema';

export class CreateMovieDto extends createZodDto(CreateMovieSchema) {
  @ApiProperty({
    description: 'ID do distribuidor (supplier) do filme',
    example: '243254863696236545',
  })
  distributor_id!: string;

  @ApiProperty({
    description: 'Título original (slug único é gerado a partir deste campo)',
    example: 'Dune: Part Two',
  })
  original_title!: string;

  @ApiPropertyOptional({
    description: 'Título local (Brasil)',
    example: 'Duna: Parte Dois',
  })
  brazil_title?: string;

  @ApiProperty({
    description: 'Duração do filme em minutos',
    example: 166,
    minimum: 1,
  })
  duration_minutes!: number;

  @ApiPropertyOptional({
    description: 'País de origem da produção',
    example: 'USA',
  })
  country_of_origin?: string;

  @ApiPropertyOptional({
    description: 'Ano de produção',
    example: 2024,
    minimum: 1900,
    maximum: 2100,
  })
  production_year?: number;

  @ApiProperty({
    description: 'Indica se é produção nacional',
    example: false,
    default: false,
  })
  national?: boolean;

  @ApiPropertyOptional({
    description: 'Sinopse completa do filme',
  })
  synopsis?: string;

  @ApiPropertyOptional({
    description: 'Sinopse resumida (até 500 caracteres)',
    maxLength: 500,
  })
  short_synopsis?: string;

  @ApiPropertyOptional({
    description: 'Website oficial do filme',
    example: 'https://dunemovie.com',
  })
  website?: string;

  @ApiPropertyOptional({
    description: 'ID da classificação indicativa (age_ratings.id)',
    example: 'AGE-12',
  })
  age_rating?: string;

  @ApiPropertyOptional({
    description: 'Lista de IDs de categorias do filme (N:N)',
    example: ['CAT-ACAO', 'CAT-FICCAO'],
  })
  category_ids?: string[];

  @ApiPropertyOptional({
    description: 'Idioma original da obra',
    example: 'en',
  })
  original_language?: string;

  @ApiPropertyOptional({
    description: 'Data de estreia mundial (ISO 8601)',
    example: '2024-11-03T00:00:00.000Z',
  })
  worldwide_release_date?: string;

  @ApiPropertyOptional({
    description:
      'Elenco inicial (opcional). Se enviado, cria os registros de elenco para o filme.',
    example: [
      { cast_type: 'DIR', artist_name: 'Denis Villeneuve' },
      {
        cast_type: 'ACT',
        artist_name: 'Timothée Chalamet',
        character_name: 'Paul Atreides',
        credit_order: 1,
      },
    ],
  })
  cast?: CastItemInput[];

  @ApiPropertyOptional({
    description:
      'Mídias iniciais (opcional). Se enviado, cria os registros de mídia do filme.',
    example: [
      {
        media_type: 'POSTER',
        media_url: 'https://img/poster.jpg',
        title: 'Poster oficial',
      },
      {
        media_type: 'TRAILER',
        media_url: 'https://youtube.com/...',
        title: 'Trailer 1',
      },
    ],
  })
  media?: MediaItemInput[];
}
