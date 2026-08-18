import { z } from 'zod';
import { tax_regime_type } from '@repo/db';

export const CreateCompanySchema = z.object({
  corporate_name: z
    .string()
    .min(3, 'Razão social deve ter no mínimo 3 caracteres')
    .max(200, 'Razão social deve ter no máximo 200 caracteres'),
  cnpj: z
    .string()
    .regex(/^\d{14}$|^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ inválido')
    .transform((val) => val.replace(/\D/g, '')),
  tax_regime: z
    .nativeEnum(tax_regime_type, { message: 'Regime tributário inválido' })
    .optional(),
  trade_name: z
    .string()
    .max(200, 'Nome fantasia deve ter no máximo 200 caracteres')
    .optional(),

  zip_code: z.string().max(10, 'CEP inválido').optional(),
  street_address: z.string().max(300, 'Endereço muito longo').optional(),
  address_number: z.string().max(20, 'Número muito longo').optional(),
  address_complement: z.string().max(100, 'Complemento muito longo').optional(),
  neighborhood: z.string().max(100, 'Bairro muito longo').optional(),
  city: z.string().max(100, 'Cidade muito longa').optional(),
  state: z.string().max(2, 'Estado deve ter 2 letras').optional(),
  country: z
    .string()
    .length(2, 'País deve ter 2 letras')
    .regex(/^[A-Z]{2}$/, 'País deve ser código ISO (ex: BR, US)')
    .default('BR')
    .optional(),

  phone: z.string().max(20, 'Telefone muito longo').optional(),
  mobile: z.string().max(20, 'Celular muito longo').optional(),
  email: z
    .string()
    .email('Email inválido')
    .max(100, 'Email muito longo')
    .optional(),
  website: z
    .string()
    .url('URL inválida')
    .max(200, 'URL muito longa')
    .optional(),

  state_registration: z
    .string()
    .max(20, 'Inscrição estadual muito longa')
    .optional(),
  municipal_registration: z
    .string()
    .max(20, 'Inscrição municipal muito longa')
    .optional(),
  recine_opt_in: z.boolean().optional(),
  recine_join_date: z
    .string()
    .datetime()
    .refine((date) => new Date(date) <= new Date(), {
      message: 'Data de adesão ao RECINE não pode ser futura',
    })
    .optional(),
  logo_url: z.string().url().max(500).optional(),
  max_complexes: z.number().int().positive().default(5).optional(),
  max_employees: z.number().int().positive().default(50).optional(),
  max_storage_gb: z.number().int().positive().default(10).optional(),
  plan_type: z
    .enum(['BASIC', 'PREMIUM', 'ENTERPRISE'])
    .default('BASIC')
    .optional(),
  plan_expires_at: z
    .string()
    .datetime()
    .refine((date) => new Date(date) > new Date(), {
      message: 'Data de expiração do plano deve ser futura',
    })
    .optional(),
});
