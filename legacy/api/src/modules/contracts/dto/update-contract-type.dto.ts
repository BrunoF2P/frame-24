import { createZodDto } from 'nestjs-zod';
import { UpdateContractTypeSchema } from './update-contract-type.schema';

export class UpdateContractTypeDto extends createZodDto(
  UpdateContractTypeSchema,
) {}
