import { z } from 'zod';

const dateString = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Data inválida')
  .transform((value) => new Date(value));

export const CreateCampaignSchema = z.object({
  promotion_type_id: z.string().min(1, 'Tipo de promoção é obrigatório'),
  campaign_code: z
    .string()
    .min(2, 'Código da campanha deve ter no mínimo 2 caracteres')
    .max(60, 'Código da campanha deve ter no máximo 60 caracteres'),
  name: z
    .string()
    .min(3, 'Nome da campanha deve ter no mínimo 3 caracteres')
    .max(120, 'Nome da campanha deve ter no máximo 120 caracteres'),
  description: z
    .string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional(),
  start_date: dateString,
  end_date: dateString,
});
