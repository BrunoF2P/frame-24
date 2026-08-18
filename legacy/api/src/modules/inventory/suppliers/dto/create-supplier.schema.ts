import { z } from 'zod';

export const CreateSupplierSchema = z.object({
  supplier_type_id: z.string().optional(),
  corporate_name: z
    .string()
    .min(3, 'Razão social deve ter no mínimo 3 caracteres'),
  trade_name: z.string().optional(),
  cnpj: z
    .string()
    .transform((val) => val.replace(/\D/g, ''))
    .refine((val) => /^\d{14}$/.test(val), 'CNPJ inválido'),
  phone: z
    .string()
    .transform((val) => val.replace(/\D/g, ''))
    .refine((val) => /^\d{10,11}$/.test(val), 'Telefone inválido'),
  email: z.string().email().optional(),
  address: z.string().optional(),
  contact_name: z.string().optional(),
  contact_phone: z
    .string()
    .transform((val) => val.replace(/\D/g, ''))
    .refine((val) => /^\d{10,11}$/.test(val), 'Telefone de contato inválido')
    .optional(),
  delivery_days: z.number().int().min(0).optional(),
  is_film_distributor: z.boolean().optional(),
  active: z.boolean().optional(),
});
