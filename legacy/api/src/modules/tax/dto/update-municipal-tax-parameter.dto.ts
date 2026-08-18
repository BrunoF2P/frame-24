import { createZodDto } from 'nestjs-zod';
import { UpdateMunicipalTaxParameterSchema } from './update-municipal-tax-parameter.schema';

export class UpdateMunicipalTaxParameterDto extends createZodDto(
  UpdateMunicipalTaxParameterSchema,
) {}
