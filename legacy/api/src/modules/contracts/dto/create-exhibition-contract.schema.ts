import { z } from 'zod';

const dateString = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Data inválida')
  .transform((value) => new Date(value));

const SlidingScaleItemSchema = z.object({
  week_number: z
    .number()
    .int('Número da semana deve ser inteiro')
    .positive('Número da semana deve ser positivo'),
  distributor_percentage: z
    .number()
    .min(0, 'Porcentagem do distribuidor não pode ser negativa')
    .max(100, 'Porcentagem do distribuidor não pode ser maior que 100'),
  exhibitor_percentage: z
    .number()
    .min(0, 'Porcentagem do exibidor não pode ser negativa')
    .max(100, 'Porcentagem do exibidor não pode ser maior que 100'),
});

export const CreateExhibitionContractSchema = z.object({
  movie_id: z.string().min(1, 'Filme é obrigatório'),
  cinema_complex_id: z.string().min(1, 'Complexo de cinema é obrigatório'),
  distributor_id: z.string().min(1, 'Distribuidor é obrigatório'),
  contract_type_id: z.string().optional().nullable(),
  settlement_base_id: z.string().optional().nullable(),
  contract_number: z
    .string()
    .max(50, 'Número do contrato muito longo')
    .optional()
    .nullable(),
  start_date: dateString,
  end_date: dateString,
  distributor_percentage: z
    .number()
    .min(0, 'Porcentagem do distribuidor não pode ser negativa')
    .max(100, 'Porcentagem do distribuidor não pode ser maior que 100'),
  exhibitor_percentage: z
    .number()
    .min(0, 'Porcentagem do exibidor não pode ser negativa')
    .max(100, 'Porcentagem do exibidor não pode ser maior que 100'),
  guaranteed_minimum: z
    .number()
    .nonnegative('Mínimo garantido não pode ser negativo')
    .optional(),
  minimum_guarantee: z
    .number()
    .nonnegative('Garantia mínima não pode ser negativa')
    .optional(),
  contract_terms: z.string().optional(),
  notes: z.string().optional(),
  active: z.boolean().optional(),
  sliding_scale: z.array(SlidingScaleItemSchema).optional(),
});

export type SlidingScaleItemInput = z.infer<typeof SlidingScaleItemSchema>;
