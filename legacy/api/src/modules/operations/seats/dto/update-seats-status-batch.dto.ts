import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';

const UpdateSeatStatusBatchItemSchema = z.object({
  seat_id: z.string(),
  active: z.boolean(),
});

const UpdateSeatsStatusBatchSchema = z.object({
  seats: z.array(UpdateSeatStatusBatchItemSchema).min(1, {
    message: 'A lista de assentos não pode estar vazia.',
  }),
});

class UpdateSeatStatusBatchItemDto {
  @ApiProperty()
  seat_id!: string;
  @ApiProperty()
  active!: boolean;
}

export class UpdateSeatsStatusBatchDto extends createZodDto(
  UpdateSeatsStatusBatchSchema,
) {
  @ApiProperty({ type: [UpdateSeatStatusBatchItemDto] })
  seats!: UpdateSeatStatusBatchItemDto[];
}
