import { createZodDto } from 'nestjs-zod';
import { CreateTicketTypeSchema } from './create-ticket-type.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const UpdateTicketTypeSchema = CreateTicketTypeSchema.partial();

export class UpdateTicketTypeDto extends createZodDto(UpdateTicketTypeSchema) {
  @ApiPropertyOptional({
    description: 'Nome do tipo de ingresso',
    example: 'Meia social',
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'Descrição do tipo de ingresso',
    example: 'Ingresso com desconto promocional',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Percentual de desconto aplicado ao preço base',
    example: 25,
  })
  discount_percentage?: number;
}
