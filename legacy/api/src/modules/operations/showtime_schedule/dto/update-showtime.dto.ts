import { createZodDto } from 'nestjs-zod';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UpdateShowtimeSchema } from './update-showtime.schema';

export class UpdateShowtimeDto extends createZodDto(UpdateShowtimeSchema) {
  @ApiPropertyOptional({
    description: 'Data e hora de início da sessão no formato ISO 8601 (em UTC)',
    example: '2025-11-15T22:00:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  start_time?: Date;

  @ApiPropertyOptional({
    description: 'Novo tipo de projeção',
  })
  projection_type?: string | null;

  @ApiPropertyOptional({
    description: 'Novo tipo de áudio',
  })
  audio_type?: string | null;

  @ApiPropertyOptional({
    description: 'Novo idioma da sessão',
  })
  session_language?: string | undefined;

  @ApiPropertyOptional({
    description: 'Novo preço base do ingresso',
    example: 30.0,
  })
  base_ticket_price?: number;

  @ApiPropertyOptional({
    description: 'Novo status da sessão',
    example: 'cancelled',
  })
  status?: string;
}
