import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const RevokeOtherSessionsSchema = z.object({
  keep_session_id: z.string().min(1).optional(),
});

export class RevokeOtherSessionsDto extends createZodDto(
  RevokeOtherSessionsSchema,
) {
  @ApiPropertyOptional({
    description:
      'ID da sessão que deve permanecer ativa (opcional, se não informado mantém a mais recente)',
    example: 'sess_123',
  })
  keep_session_id?: string;
}
