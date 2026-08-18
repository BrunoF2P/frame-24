import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const UpdateAccountPayableSchema = z.object({
  document_number: z.string().min(1).max(50).optional(),
  description: z.string().min(1).optional(),

  issue_date: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date format',
    })
    .optional(),
  due_date: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date format',
    })
    .optional(),
  competence_date: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date format',
    })
    .optional(),

  interest_amount: z.number().min(0).optional(),
  penalty_amount: z.number().min(0).optional(),
  discount_amount: z.number().min(0).optional(),
});

export class UpdateAccountPayableDto extends createZodDto(
  UpdateAccountPayableSchema,
) {}
