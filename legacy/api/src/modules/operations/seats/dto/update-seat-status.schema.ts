import { z } from 'zod';

export const UpdateSeatStatusSchema = z.object({
  active: z.coerce.boolean({
    message: 'O campo "active" deve ser um valor booleano (true ou false).',
  }),
});
