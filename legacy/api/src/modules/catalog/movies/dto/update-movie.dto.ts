import { createZodDto } from 'nestjs-zod';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CastItemInput, MediaItemInput } from './create-movie.schema';
import { UpdateMovieSchema } from './update-movie.schema';

export class UpdateMovieDto extends createZodDto(UpdateMovieSchema) {
  @ApiPropertyOptional({
    description: 'ID do distribuidor (supplier) do filme',
  })
  distributor_id?: string;

  @ApiPropertyOptional({
    description:
      'Título original. Se alterado, o slug único será recalculado automaticamente.',
  })
  original_title?: string;

  @ApiPropertyOptional({ description: 'Título local (Brasil)' })
  brazil_title?: string;

  @ApiPropertyOptional({
    description: 'Duração do filme em minutos',
    minimum: 1,
  })
  duration_minutes?: number;

  @ApiPropertyOptional({ description: 'País de origem da produção' })
  country_of_origin?: string;

  @ApiPropertyOptional({
    description: 'Ano de produção',
    minimum: 1900,
    maximum: 2100,
  })
  production_year?: number;

  @ApiPropertyOptional({ description: 'Indica se é produção nacional' })
  national?: boolean;

  @ApiPropertyOptional({ description: 'Sinopse completa do filme' })
  synopsis?: string;

  @ApiPropertyOptional({
    description: 'Sinopse resumida (até 500 caracteres)',
    maxLength: 500,
  })
  short_synopsis?: string;

  @ApiPropertyOptional({ description: 'Website oficial do filme' })
  website?: string;

  @ApiPropertyOptional({
    description: 'ID da classificação indicativa (age_ratings.id)',
  })
  age_rating?: string;

  @ApiPropertyOptional({
    description:
      'Lista de IDs de categorias do filme (N:N). Ao enviar, sincroniza.',
    example: ['CAT-DRAMA', 'CAT-FICCAO'],
  })
  category_ids?: string[];

  @ApiPropertyOptional({ description: 'Identificador no TMDB' })
  tmdb_id?: string;

  @ApiPropertyOptional({ description: 'Identificador no IMDB' })
  imdb_id?: string;

  @ApiPropertyOptional({ description: 'Campo de tags em JSON (string)' })
  tags_json?: string;

  @ApiPropertyOptional({ description: 'Idioma original da obra' })
  original_language?: string;

  @ApiPropertyOptional({
    description: 'Data de estreia mundial (ISO 8601)',
  })
  worldwide_release_date?: string;

  @ApiPropertyOptional({ description: 'Ativo/inativo' })
  active?: boolean;

  @ApiPropertyOptional({
    description:
      'Elenco completo para substituição. Se enviado, apaga o elenco anterior e recria conforme itens.',
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
      'Mídias completas para substituição. Se enviado, apaga as mídias anteriores e recria conforme itens.',
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
