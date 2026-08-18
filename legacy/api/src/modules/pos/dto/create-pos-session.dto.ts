import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const CreatePosSessionSchema = z
  .object({
    cinema_complex_id: z.string().min(1, 'Complexo de cinema é obrigatório'),
    opening_amount: z
      .number()
      .min(0, 'Valor de abertura não pode ser negativo')
      .default(0),
  })
  .strict();

export class CreatePosSessionDto extends createZodDto(CreatePosSessionSchema) {
  @ApiProperty({
    description: 'ID do complexo de cinema',
    example: '243244130367442946',
  })
  cinema_complex_id!: string;

  @ApiProperty({
    description: 'Valor inicial em caixa (fundo de troco)',
    example: 200.0,
    default: 0,
  })
  opening_amount!: number;
}
