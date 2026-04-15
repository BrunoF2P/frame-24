import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

const trimLowerEmail = z
  .string()
  .email('E-mail inválido')
  .transform((value) => value.trim().toLowerCase());

export const RequestCustomerEmailChangeSchema = z.object({
  new_email: trimLowerEmail,
});

export class RequestCustomerEmailChangeDto extends createZodDto(
  RequestCustomerEmailChangeSchema,
) {
  @ApiProperty({
    description: 'Novo e-mail que deve ser confirmado',
    example: 'novo.email@exemplo.com',
  })
  new_email!: string;
}

export const ConfirmCustomerEmailChangeSchema = z.object({
  request_id: z.string().min(1, 'request_id é obrigatório'),
  token: z.string().min(8, 'token inválido'),
});

export class ConfirmCustomerEmailChangeDto extends createZodDto(
  ConfirmCustomerEmailChangeSchema,
) {
  @ApiProperty({
    description: 'Identificador da solicitação de troca de e-mail',
    example: 'req_123',
  })
  request_id!: string;

  @ApiProperty({
    description: 'Token recebido no novo e-mail',
    example: '6fa8ef2b1d9a7f....',
  })
  token!: string;
}
