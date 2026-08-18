import { z } from 'zod';

export const CinemaComplexSchema = z.object({
  company_id: z.string().min(1, 'O ID da empresa é obrigatório.').optional(),

  name: z
    .string()
    .min(1, 'O nome é obrigatório.')
    .max(200, 'O nome deve ter no máximo 200 caracteres.'),

  code: z
    .string()
    .min(1, 'O código é obrigatório.')
    .max(50, 'O código deve ter no máximo 50 caracteres.'),

  cnpj: z
    .string()
    .max(18, 'O CNPJ deve ter no máximo 18 caracteres.')
    .optional(),

  address: z.string().optional(),

  city: z
    .string()
    .max(100, 'A cidade deve ter no máximo 100 caracteres.')
    .optional(),

  state: z.string().length(2, 'O estado deve ter 2 caracteres.').optional(),

  postal_code: z
    .string()
    .max(10, 'O CEP deve ter no máximo 10 caracteres.')
    .optional(),

  ibge_municipality_code: z
    .string()
    .length(7, 'O código do município no IBGE deve ter 7 caracteres.'),

  ancine_registry: z
    .string()
    .max(50, 'O registro ANCINE deve ter no máximo 50 caracteres.')
    .optional(),

  opening_date: z
    .string()
    .datetime({ message: 'Data inválida. Use formato ISO 8601.' })
    .optional(),

  active: z.boolean().default(true).optional(),
});
