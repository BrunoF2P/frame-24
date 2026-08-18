import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const UpdatePosSessionSchema = z
  .object({
    status: z.string().min(1, 'Status é obrigatório').optional(),
    cash_withdrawn: z
      .number()
      .min(0, 'Valor retirado não pode ser negativo')
      .optional(),
    cash_counted: z
      .number()
      .min(0, 'Valor contado não pode ser negativo')
      .optional(),
    closing_notes: z
      .string()
      .max(500, 'Notas de fechamento devem ter no máximo 500 caracteres')
      .optional(),
  })
  .strict();

export class UpdatePosSessionDto extends createZodDto(UpdatePosSessionSchema) {
  @ApiPropertyOptional({
    description: 'Novo status da sessão (ex: closed)',
    example: 'closed',
  })
  status?: string;

  @ApiPropertyOptional({
    description: 'Valor em espécie retirado do caixa',
    example: 150.0,
  })
  cash_withdrawn?: number;

  @ApiPropertyOptional({
    description: 'Valor contado no fechamento do caixa',
    example: 3450.75,
  })
  cash_counted?: number;

  @ApiPropertyOptional({
    description: 'Observações do fechamento',
    example: 'Diferença de R$ 2,50 a menos — moeda não encontrada',
  })
  closing_notes?: string;
}
