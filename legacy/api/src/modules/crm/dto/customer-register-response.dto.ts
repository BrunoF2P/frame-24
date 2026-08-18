import { ApiProperty } from '@nestjs/swagger';

export class CustomerRegisterResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({
    example:
      'Cadastro realizado com sucesso. Faça login pelo provedor de autenticação para acessar sua conta.',
  })
  message!: string;

  @ApiProperty({ example: '9d3b4d5e-2ff0-4a56-9db3-9f11c443e0f0' })
  customer_id!: string;

  @ApiProperty({ example: 'cine-frame-0195' })
  tenant_slug!: string;

  @ApiProperty({ example: 'maria@cineframe.com.br' })
  email!: string;
}
