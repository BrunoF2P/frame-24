import { createZodDto } from 'nestjs-zod';
import { CreateSaleSchema } from 'src/modules/sales/dto/create-sale.dto';

/** Checkout público: `customer_id` vem só do contexto autenticado (nunca do corpo). */
export const PublicCreateSaleSchema = CreateSaleSchema.omit({
  customer_id: true,
});

export class PublicCreateSaleDto extends createZodDto(PublicCreateSaleSchema) {}
