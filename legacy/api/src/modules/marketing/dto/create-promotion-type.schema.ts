import { z } from 'zod';

export const CreatePromotionTypeSchema = z.object({
  code: z
    .string()
    .min(2, 'Código deve ter no mínimo 2 caracteres')
    .max(30, 'Código deve ter no máximo 30 caracteres'),
  name: z
    .string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  description: z
    .string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional(),
  active: z.boolean().optional(),
});
