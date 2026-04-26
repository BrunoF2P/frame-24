import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CheckoutTicketSchema = z.object({
  seat_id: z.string().min(1),
  ticket_type: z.string().optional(),
});

const CheckoutConcessionSchema = z.object({
  item_type: z.enum(['PRODUCT', 'COMBO']).default('PRODUCT'),
  item_id: z.string().min(1),
  quantity: z.number().int().min(1),
});

export const CreateCheckoutSessionSchema = z.object({
  tenant_slug: z.string().min(1),
  showtime_id: z.string().min(1),
  reservation_uuid: z.string().min(1),
  fiscal_cpf: z.string().optional(),
  promotion_code: z.string().optional(),
  tickets: z.array(CheckoutTicketSchema).min(1),
  concession_items: z.array(CheckoutConcessionSchema).optional(),
});

export const UpdateCheckoutSessionSchema = z.object({
  fiscal_cpf: z.string().optional(),
  promotion_code: z.string().optional(),
  tickets: z.array(CheckoutTicketSchema).min(1).optional(),
  concession_items: z.array(CheckoutConcessionSchema).optional(),
});

export const CreatePaymentAttemptSchema = z.object({
  method: z.string().min(1),
  provider: z.string().default('internal').optional(),
  simulate_status: z.enum(['paid', 'pending', 'failed', 'expired']).optional(),
});

export const PaymentWebhookSchema = z.object({
  external_event_id: z.string().optional(),
  provider_reference: z.string().min(1),
  status: z.enum(['paid', 'pending', 'failed', 'expired']),
  error_code: z.string().optional(),
  error_message: z.string().optional(),
  payment_data: z.record(z.string(), z.unknown()).optional(),
});

export class CreateCheckoutSessionDto extends createZodDto(
  CreateCheckoutSessionSchema,
) {}

export class UpdateCheckoutSessionDto extends createZodDto(
  UpdateCheckoutSessionSchema,
) {}

export class CreatePaymentAttemptDto extends createZodDto(
  CreatePaymentAttemptSchema,
) {}

export class PaymentWebhookDto extends createZodDto(PaymentWebhookSchema) {}

export type CheckoutTicketInput = z.infer<typeof CheckoutTicketSchema>;
export type CheckoutConcessionInput = z.infer<typeof CheckoutConcessionSchema>;
