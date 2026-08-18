import { createZodDto } from 'nestjs-zod';
import { UpdateFederalTaxRateSchema } from './update-federal-tax-rate.schema';

export class UpdateFederalTaxRateDto extends createZodDto(
  UpdateFederalTaxRateSchema,
) {}
