import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CashFlowQuerySchema = z.object({
  bank_account_id: z.string().optional(),
  entry_type: z.enum(['receipt', 'payment']).optional(),
  category: z.string().optional(),
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  status: z.enum(['pending', 'confirmed', 'reconciled']).optional(),
  skip: z.number().int().min(0).default(0),
  take: z.number().int().min(1).max(100).default(20),
});

export class CashFlowQueryDto extends createZodDto(CashFlowQuerySchema) {}

export type CashFlowQueryType = z.infer<typeof CashFlowQuerySchema>;
