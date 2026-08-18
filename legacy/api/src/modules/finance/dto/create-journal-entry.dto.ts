import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const JournalEntryItemSchema = z.object({
  account_id: z.string().min(1, 'Conta contábil é obrigatória'),
  movement_type: z.enum(['DEBIT', 'CREDIT'], {
    message: 'Tipo de movimento inválido',
  }),
  amount: z.number().positive('Valor deve ser positivo'),
  item_description: z.string().optional(),
});

export const CreateJournalEntrySchema = z.object({
  cinema_complex_id: z.string().min(1, 'Complexo de cinema é obrigatório'),
  entry_date: z.string().min(1, 'Data do lançamento é obrigatória'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  origin_type: z.string().optional(),
  origin_id: z.string().optional(),
  items: z
    .array(JournalEntryItemSchema)
    .min(2, 'Lançamento deve ter pelo menos 2 itens (partida dobrada)'),
});

export class CreateJournalEntryDto extends createZodDto(
  CreateJournalEntrySchema,
) {
  @ApiProperty({
    description: 'ID do complexo de cinema',
    example: '23425326464646652',
  })
  cinema_complex_id!: string;

  @ApiProperty({
    description: 'Data do lançamento',
    example: '2025-11-15',
  })
  entry_date!: string;

  @ApiProperty({
    description: 'Descrição do lançamento',
    example: 'Reconhecimento de receita de bilheteria',
  })
  description!: string;

  @ApiProperty({
    description: 'Itens do lançamento (débito/crédito)',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'ID da conta' },
        movement_type: {
          type: 'string',
          enum: ['DEBIT', 'CREDIT'],
          description: 'Tipo de movimento',
        },
        amount: { type: 'number', description: 'Valor' },
        item_description: {
          type: 'string',
          description: 'Descrição do item',
        },
      },
    },
    example: [
      {
        account_id: '1.1.1.01',
        movement_type: 'DEBIT',
        amount: 1000.0,
        item_description: 'Recebimento em dinheiro',
      },
      {
        account_id: '3.1.1.01',
        movement_type: 'CREDIT',
        amount: 1000.0,
        item_description: 'Reconhecimento de receita',
      },
    ],
  })
  items!: Array<z.infer<typeof JournalEntryItemSchema>>;

  @ApiPropertyOptional({
    description: 'Tipo de origem (ex: venda, pagamento)',
    example: 'sale',
  })
  origin_type?: string;

  @ApiPropertyOptional({
    description: 'ID de referência da origem',
    example: '23425326464646652',
  })
  origin_id?: string;
}
