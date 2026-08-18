import { z } from 'zod';

export const CreateFederalTaxRateSchema = z.object({
  tax_regime: z.string().max(50, 'Regime tributário muito longo').optional(),
  pis_cofins_regime: z
    .string()
    .max(50, 'Regime PIS/COFINS muito longo')
    .optional(),
  revenue_type: z.string().max(100, 'Tipo de receita muito longo').optional(),
  pis_rate: z.number().nonnegative('Alíquota PIS não pode ser negativa'),
  cofins_rate: z.number().nonnegative('Alíquota COFINS não pode ser negativa'),
  credit_allowed: z.boolean().optional(),
  irpj_base_rate: z
    .number()
    .nonnegative('Alíquota base IRPJ não pode ser negativa')
    .optional(),
  irpj_additional_rate: z
    .number()
    .nonnegative('Alíquota adicional IRPJ não pode ser negativa')
    .optional(),
  irpj_additional_limit: z
    .number()
    .nonnegative('Limite adicional IRPJ não pode ser negativo')
    .optional(),
  csll_rate: z
    .number()
    .nonnegative('Alíquota CSLL não pode ser negativa')
    .optional(),
  presumed_profit_percentage: z
    .number()
    .nonnegative('Porcentagem de lucro presumido não pode ser negativa')
    .optional(),
  validity_start: z
    .string()
    .refine((value) => !isNaN(Date.parse(value)), 'Data inválida')
    .transform((value) => new Date(value)),
  validity_end: z
    .string()
    .optional()
    .nullable()
    .refine((value) => !value || !isNaN(Date.parse(value)), 'Data inválida')
    .transform((value) => (value ? new Date(value) : undefined)),
  active: z.boolean().optional(),
});
