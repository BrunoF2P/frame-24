import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CashFlowReportQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  days: z.string().transform(Number).optional(),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
  bank_account_id: z.string().optional(),
  cinema_complex_id: z.string().optional(),
});

export class CashFlowReportQueryDto extends createZodDto(
  CashFlowReportQuerySchema,
) {}
