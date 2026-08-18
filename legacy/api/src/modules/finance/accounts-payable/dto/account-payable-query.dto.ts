import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const AccountPayableQuerySchema = z.object({
  cinema_complex_id: z.string().uuid().optional(),
  supplier_id: z.string().uuid().optional(),
  status: z
    .enum(['pending', 'partially_paid', 'paid', 'cancelled', 'overdue'])
    .optional(),

  start_due_date: z.string().optional(),
  end_due_date: z.string().optional(),

  page: z.string().default('1').transform(Number),
  per_page: z.string().default('20').transform(Number),
});

export class AccountPayableQueryDto extends createZodDto(
  AccountPayableQuerySchema,
) {}
