import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const SeatStatusResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  allows_modification: z.boolean().nullable(),
  is_default: z.boolean(),
});

export class SeatStatusResponseDto extends createZodDto(
  SeatStatusResponseSchema,
) {
  @ApiProperty({
    description: 'ID do status do assento.',
    example: 'st_1234567890abcdef',
  })
  id!: string;

  @ApiProperty({
    description: 'Nome do status.',
    example: 'Disponível',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Descrição opcional do status.',
    example: 'Assento disponível para venda',
    nullable: true,
  })
  description!: string | null;

  @ApiPropertyOptional({
    description: 'Indica se o status permite modificação.',
    example: true,
    nullable: true,
  })
  allows_modification!: boolean | null;

  @ApiProperty({
    description: 'Indica se este status é o padrão da empresa.',
    example: false,
  })
  is_default!: boolean;
}

export type SeatStatusResponse = z.infer<typeof SeatStatusResponseSchema>;
