import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { CustomerAuthService } from '../services/customer-auth.service';
import { RegisterCustomerDto } from '../dto/register-customer.dto';
import { LoginCustomerDto } from '../dto/login-customer.dto';
import { CustomerAuthResponseDto } from '../dto/customer-auth-response.dto';
import { CustomerRegisterResponseDto } from '../dto/customer-register-response.dto';

@ApiTags('Customer Auth')
@Controller({ path: 'customer/auth', version: '1' })
export class CustomerAuthController {
  constructor(private readonly customerAuthService: CustomerAuthService) {}

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar novo cliente',
    description: 'Cria uma nova conta de cliente para uma empresa específica',
  })
  @ApiResponse({
    status: 201,
    description: 'Cliente registrado com sucesso',
    type: CustomerRegisterResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Email ou CPF já cadastrado',
  })
  async register(
    @Body() dto: RegisterCustomerDto,
  ): Promise<CustomerRegisterResponseDto> {
    return this.customerAuthService.register(dto);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login de cliente (legado)',
    description:
      'Endpoint legado desativado. O login deve ser realizado via Authentik/OIDC no frontend.',
    deprecated: true,
  })
  @ApiUnauthorizedResponse({
    description:
      'Fluxo legado desativado. Use o login OIDC/Authentik para obter o access token.',
  })
  async login(@Body() dto: LoginCustomerDto): Promise<CustomerAuthResponseDto> {
    return this.customerAuthService.login(dto);
  }
}
