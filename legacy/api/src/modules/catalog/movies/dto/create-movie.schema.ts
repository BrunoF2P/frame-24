import { z } from 'zod';

export const CastItemSchema = z.object({
  cast_type: z.string().min(1, 'Tipo de elenco é obrigatório'),
  artist_name: z.string().min(1, 'Nome do artista é obrigatório'),
  character_name: z.string().optional(),
  credit_order: z
    .number()
    .int('Ordem deve ser um número inteiro')
    .min(0, 'Ordem deve ser positiva')
    .optional(),
  photo_url: z.string().url('URL da foto inválida').optional(),
});

export const MediaItemSchema = z.object({
  media_type: z.string().min(1, 'Tipo de mídia é obrigatório'),
  media_url: z.string().url('URL da mídia inválida'),
  title: z.string().optional(),
  description: z.string().optional(),
  width: z
    .number()
    .int('Largura deve ser um número inteiro')
    .positive('Largura deve ser positiva')
    .optional(),
  height: z
    .number()
    .int('Altura deve ser um número inteiro')
    .positive('Altura deve ser positiva')
    .optional(),
});

export const CreateMovieSchema = z.object({
  distributor_id: z.string().min(1, 'ID do distribuidor é obrigatório'),
  original_title: z.string().min(1, 'Título original é obrigatório'),
  brazil_title: z.string().optional(),
  duration_minutes: z
    .number()
    .int('Duração deve ser um número inteiro')
    .min(1, 'Duração deve ser no mínimo 1 minuto'),
  country_of_origin: z.string().optional(),
  production_year: z
    .number()
    .int('Ano deve ser um número inteiro')
    .min(1900, 'Ano deve ser maior que 1900')
    .max(2100, 'Ano deve ser menor que 2100')
    .optional(),
  national: z.boolean().optional(),
  synopsis: z.string().optional(),
  short_synopsis: z
    .string()
    .max(500, 'Sinopse resumida deve ter no máximo 500 caracteres')
    .optional(),
  website: z.string().url('URL do site inválida').optional(),
  age_rating: z.string().optional(),
  category_ids: z.array(z.string()).optional(),
  original_language: z.string().optional(),
  worldwide_release_date: z
    .string()
    .datetime('Data de estreia inválida')
    .optional(),
  cast: z.array(CastItemSchema).optional(),
  media: z.array(MediaItemSchema).optional(),
});

export type CastItemInput = z.infer<typeof CastItemSchema>;
export type MediaItemInput = z.infer<typeof MediaItemSchema>;
