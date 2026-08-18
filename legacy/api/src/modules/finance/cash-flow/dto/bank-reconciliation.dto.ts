import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateBankReconciliationSchema = z.object({
  bank_account_id: z.string().min(1),
  reference_month: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  opening_balance: z.number(),
  closing_balance: z.number(),
  bank_statement_balance: z.number(),
  notes: z.string().optional(),
});

export class CreateBankReconciliationDto extends createZodDto(
  CreateBankReconciliationSchema,
) {}

const UpdateBankReconciliationSchema = z.object({
  closing_balance: z.number().optional(),
  bank_statement_balance: z.number().optional(),
  notes: z.string().optional(),
  status: z.enum(['pending', 'completed']).optional(),
});

export class UpdateBankReconciliationDto extends createZodDto(
  UpdateBankReconciliationSchema,
) {}
