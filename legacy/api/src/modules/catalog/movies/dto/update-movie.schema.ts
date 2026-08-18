import { z } from 'zod';
import {
  CastItemSchema,
  CreateMovieSchema,
  MediaItemSchema,
} from './create-movie.schema';

export const UpdateMovieSchema = CreateMovieSchema.partial().extend({
  cast: z.array(CastItemSchema).optional(),
  media: z.array(MediaItemSchema).optional(),
  tmdb_id: z.string().optional(),
  imdb_id: z.string().optional(),
  tags_json: z.string().optional(),
});
