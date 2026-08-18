import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const SessionStatusResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  allows_modification: z.boolean().nullable(),
});

export class SessionStatusResponseDto extends createZodDto(
  SessionStatusResponseSchema,
) {
  @ApiProperty({
    description: 'ID do status de sessão.',
    example: 'ss_1234567890abcdef',
  })
  id!: string;

  @ApiProperty({
    description: 'Nome do status de sessão.',
    example: 'Agendada',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Descrição opcional.',
    example: 'Sessão planejada e aberta para venda',
    nullable: true,
  })
  description!: string | null;

  @ApiPropertyOptional({
    description: 'Indica se a sessão pode ser modificada.',
    example: true,
    nullable: true,
  })
  allows_modification!: boolean | null;
}

export type SessionStatusResponse = z.infer<typeof SessionStatusResponseSchema>;
