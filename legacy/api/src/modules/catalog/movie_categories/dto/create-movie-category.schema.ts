import { z } from 'zod';

export const CreateMovieCategorySchema = z.object({
  name: z
    .string()
    .min(1, 'Nome da categoria é obrigatório')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  description: z.string().optional(),
  minimum_age: z
    .number()
    .int('Idade mínima deve ser um número inteiro')
    .min(0, 'Idade mínima não pode ser negativa')
    .optional(),
  active: z.boolean().optional(),
});
