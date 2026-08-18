import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CustomerPositionQuerySchema = z.object({
  customer_id: z.string().optional(),
  cinema_complex_id: z.string().optional(),
  min_overdue_days: z.coerce.number().optional(),
  min_open_amount: z.coerce.number().optional(),
});

export class CustomerPositionQueryDto extends createZodDto(
  CustomerPositionQuerySchema,
) {}

export const SupplierPositionQuerySchema = z.object({
  supplier_id: z.string().optional(),
  cinema_complex_id: z.string().optional(),
  upcoming_days: z.coerce.number().default(30),
});

export class SupplierPositionQueryDto extends createZodDto(
  SupplierPositionQuerySchema,
) {}
