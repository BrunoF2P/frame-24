import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const SessionLanguageResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  abbreviation: z.string().nullable(),
});

export class SessionLanguageResponseDto extends createZodDto(
  SessionLanguageResponseSchema,
) {
  @ApiProperty({
    description: 'ID da linguagem de sessão.',
    example: 'sl_1234567890abcdef',
  })
  id!: string;

  @ApiProperty({
    description: 'Nome da linguagem.',
    example: 'Português',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Descrição opcional.',
    example: 'Idioma principal da sessão',
    nullable: true,
  })
  description!: string | null;

  @ApiPropertyOptional({
    description: 'Abreviação da linguagem.',
    example: 'PT-BR',
    nullable: true,
  })
  abbreviation!: string | null;
}

export type SessionLanguageResponse = z.infer<
  typeof SessionLanguageResponseSchema
>;
