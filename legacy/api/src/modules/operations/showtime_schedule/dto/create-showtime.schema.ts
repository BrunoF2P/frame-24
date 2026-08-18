import { z } from 'zod';

export const CreateShowtimeSchema = z.object({
  movie_id: z.string().min(1, 'O ID do filme é obrigatório.'),

  room_id: z.string().min(1, 'O ID da sala é obrigatório.'),

  start_time: z
    .string()
    .min(1, 'A data e hora de início são obrigatórias.')
    .datetime({
      message: 'Formato de data e hora inválido. Use o padrão ISO 8601.',
    })
    .pipe(z.coerce.date()),

  projection_type: z.string().optional().nullable(),

  audio_type: z.string().optional().nullable(),

  session_language: z.string().min(1, 'O idioma da sessão é obrigatório.'),

  base_ticket_price: z
    .number()
    .positive('O preço base deve ser um valor positivo.'),

  status: z.string().optional(),
});
