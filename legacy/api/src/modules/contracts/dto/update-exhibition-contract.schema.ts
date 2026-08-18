import { z } from 'zod';
import { CreateExhibitionContractSchema } from './create-exhibition-contract.schema';

const dateString = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Data inválida')
  .transform((value) => new Date(value));

export const UpdateExhibitionContractSchema =
  CreateExhibitionContractSchema.partial().extend({
    start_date: dateString.optional(),
    end_date: dateString.optional(),
    sliding_scale: CreateExhibitionContractSchema.shape.sliding_scale,
  });
