import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';
import { UpdateSeatStatusSchema } from './update-seat-status.schema';

export class UpdateSeatStatusDto extends createZodDto(UpdateSeatStatusSchema) {
  @ApiProperty({
    description:
      'O novo status do assento (true para ativo, false para inativo/manutenção).',
    example: false,
  })
  active!: boolean;
}
