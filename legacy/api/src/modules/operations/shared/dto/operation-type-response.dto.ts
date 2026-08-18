import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const OperationTypeResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  additional_value: z.string().nullable(),
});

export class OperationTypeResponseDto extends createZodDto(
  OperationTypeResponseSchema,
) {
  @ApiProperty({
    description: 'ID do tipo de operação.',
    example: 'ckx1234567890abcdef',
  })
  id!: string;

  @ApiProperty({
    description: 'Nome do tipo de operação.',
    example: 'Dolby Atmos',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Descrição opcional.',
    example: 'Som imersivo premium',
    nullable: true,
  })
  description!: string | null;

  @ApiPropertyOptional({
    description: 'Valor adicional aplicado.',
    example: '12.50',
    nullable: true,
  })
  additional_value!: string | null;
}

export type OperationTypeResponse = z.infer<typeof OperationTypeResponseSchema>;
