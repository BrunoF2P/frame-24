import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UpdateBankAccountSchema = z.object({
  bank_name: z.string().min(1).max(100).optional(),
  bank_code: z.string().max(10).optional(),
  agency: z.string().min(1).max(20).optional(),
  agency_digit: z.string().max(2).optional(),
  account_number: z.string().min(1).max(20).optional(),
  account_digit: z.string().max(2).optional(),
  account_type: z.enum(['checking', 'savings', 'investment']).optional(),
  description: z.string().optional(),
  active: z.boolean().optional(),
});

export class UpdateBankAccountDto extends createZodDto(
  UpdateBankAccountSchema,
) {}
