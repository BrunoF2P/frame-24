import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const RequestCustomerDataExportSchema = z.object({
  format: z.enum(['json']).default('json').optional(),
});

export class RequestCustomerDataExportDto extends createZodDto(
  RequestCustomerDataExportSchema,
) {
  @ApiPropertyOptional({
    description: 'Formato de exportação dos dados',
    example: 'json',
  })
  format?: 'json';
}

export const RequestCustomerDeleteSchema = z.object({
  reason: z.string().min(3).max(500).optional(),
  confirm_phrase: z
    .string()
    .trim()
    .refine(
      (value) => value.toUpperCase() === 'EXCLUIR MINHA CONTA',
      'A frase de confirmação é inválida',
    ),
});

export class RequestCustomerDeleteDto extends createZodDto(
  RequestCustomerDeleteSchema,
) {
  @ApiPropertyOptional({
    description: 'Motivo da solicitação',
    example: 'Desejo encerrar minha conta.',
  })
  reason?: string;

  @ApiPropertyOptional({
    description: 'Frase obrigatória para confirmar solicitação',
    example: 'EXCLUIR MINHA CONTA',
  })
  confirm_phrase!: string;
}
