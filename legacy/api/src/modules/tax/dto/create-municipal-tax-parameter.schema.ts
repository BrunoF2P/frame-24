import { z } from 'zod';

export const CreateMunicipalTaxParameterSchema = z.object({
  ibge_municipality_code: z
    .string()
    .length(7, 'Código IBGE deve conter 7 dígitos'),
  municipality_name: z
    .string()
    .min(2, 'Nome do município deve ter no mínimo 2 caracteres')
    .max(100, 'Nome do município deve ter no máximo 100 caracteres'),
  state: z.string().length(2, 'Estado deve ser informado com a sigla (ex: SP)'),
  iss_rate: z
    .number({ message: 'A alíquota ISS deve ser numérica' })
    .positive('A alíquota deve ser maior que zero'),
  iss_service_code: z.string().max(10).optional(),
  iss_concession_applicable: z.boolean().optional(),
  iss_concession_service_code: z.string().max(10).optional(),
  iss_withholding: z.boolean().optional(),

  // ✅ Correção: Use string com pipe para converter, ou coerce se preferir
  // A solução mais segura para nestjs-zod + Swagger é receber string e transformar
  validity_start: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Data inválida') // Valida formato data
    .transform((val) => new Date(val)), // Transforma em objeto Date para o backend

  validity_end: z
    .string()
    .optional()
    .nullable() // Permite null explicitamente
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Data inválida')
    .transform((val) => (val ? new Date(val) : undefined)), // Transforma se existir

  notes: z.string().max(500).optional(),
  active: z.boolean().optional(),
});
