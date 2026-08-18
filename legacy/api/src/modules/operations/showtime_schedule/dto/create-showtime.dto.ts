import { createZodDto } from 'nestjs-zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateShowtimeSchema } from './create-showtime.schema';

export class CreateShowtimeDto extends createZodDto(CreateShowtimeSchema) {
  @ApiProperty({
    description: 'ID do filme que será exibido',
    example: '380795126300966912',
  })
  movie_id!: string;

  @ApiProperty({
    description: 'ID da sala onde a sessão será exibida',
    example: '380862024220082176',
  })
  room_id!: string;

  @ApiProperty({
    description: 'Data e hora de início da sessão no formato ISO 8601 (em UTC)',
    example: '2025-11-15T22:00:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  start_time!: Date;

  @ApiPropertyOptional({
    description: 'Tipo de projeção (2D, 3D, IMAX, etc)',
    example: '31231314121312',
  })
  projection_type?: string | null;

  @ApiPropertyOptional({
    description: 'Tipo de áudio (Dolby Atmos, DTS, etc)',
    example: '212121341241412',
  })
  audio_type?: string | null;

  @ApiProperty({
    description: 'Idioma da sessão (Legendado, Dublado, Original)',
    example: '3123231412412411',
  })
  session_language!: string;

  @ApiProperty({
    description: 'Preço base do ingresso para esta sessão',
    example: 25.0,
  })
  base_ticket_price!: number;

  @ApiPropertyOptional({
    description:
      'Status da sessão. Se não informado, será definido como padrão',
    example: 'scheduled',
  })
  status?: string;
}
