import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const AgingReportQuerySchema = z.object({
  base_date: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date format',
    })
    .optional(), // Defaults to today

  cinema_complex_id: z.string().uuid().optional(),
});

export class AgingReportQueryDto extends createZodDto(AgingReportQuerySchema) {}
