import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';

const ChangePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Senha atual é obrigatória'),
    new_password: z
      .string()
      .min(8, 'Nova senha deve ter no mínimo 8 caracteres')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Nova senha deve conter maiúscula, minúscula e número',
      ),
    confirm_password: z.string().min(1, 'Confirmação de senha é obrigatória'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'As senhas não conferem',
    path: ['confirm_password'],
  })
  .refine((data) => data.current_password !== data.new_password, {
    message: 'A nova senha deve ser diferente da senha atual',
    path: ['new_password'],
  });

export class ChangePasswordDto extends createZodDto(ChangePasswordSchema) {
  @ApiProperty({
    description: 'Senha atual do usuário',
    example: 'SenhaAntiga123',
  })
  current_password!: string;

  @ApiProperty({
    description:
      'Nova senha (mín. 8 caracteres, maiúscula, minúscula e número)',
    example: 'SenhaNova456',
    minLength: 8,
  })
  new_password!: string;

  @ApiProperty({
    description: 'Confirmação da nova senha',
    example: 'SenhaNova456',
  })
  confirm_password!: string;
}
