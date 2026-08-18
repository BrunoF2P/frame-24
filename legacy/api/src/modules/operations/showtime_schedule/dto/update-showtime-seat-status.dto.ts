import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const UpdateSeatStatusSchema = z.object({
  status: z.enum(['Bloqueado', 'Disponível'], { message: 'Status inválido' }),
});

export class UpdateShowtimeSeatStatusDto extends createZodDto(
  UpdateSeatStatusSchema,
) {
  @ApiProperty({
    description: 'Novo status do assento',
    enum: ['Bloqueado', 'Disponível'],
  })
  status!: 'Bloqueado' | 'Disponível';
}
