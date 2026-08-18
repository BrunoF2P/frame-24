import { createZodDto } from 'nestjs-zod';
import { UpdateExhibitionContractSchema } from './update-exhibition-contract.schema';

export class UpdateExhibitionContractDto extends createZodDto(
  UpdateExhibitionContractSchema,
) {}
