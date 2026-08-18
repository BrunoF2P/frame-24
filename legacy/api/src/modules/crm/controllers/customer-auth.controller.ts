import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { CustomerAuthService } from '../services/customer-auth.service';
import { RegisterCustomerDto } from '../dto/register-customer.dto';
import { CustomerRegisterResponseDto } from '../dto/customer-register-response.dto';
import { auth } from 'src/lib/auth';
import { fromNodeHeaders } from 'better-auth/node';
import {
  CustomerSignupOnlyThrottle,
  ProvisioningOnlyThrottle,
} from 'src/common/decorators/auth-throttle.decorator';

type ActivateCustomerAccessDto = {
  company_id: string;
  full_name: string;
  cpf?: string;
  phone?: string;
  birth_date?: string;
  accepts_marketing?: boolean;
  accepts_email?: boolean;
  accepts_sms?: boolean;
};

@ApiTags('Customer Auth')
@Controller({ path: 'customer/auth', version: '1' })
export class CustomerAuthController {
  constructor(private readonly customerAuthService: CustomerAuthService) {}

  @Post('register')
  @Public()
  @CustomerSignupOnlyThrottle()
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
  @ApiResponse({ status: 429, description: 'Limite de requisições excedido' })
  async register(
    @Body() dto: RegisterCustomerDto,
  ): Promise<CustomerRegisterResponseDto> {
    return this.customerAuthService.register(dto);
  }

  @Post('activate')
  @Public()
  @ProvisioningOnlyThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ativar acesso de cliente na empresa atual',
    description:
      'Usa sessão já autenticada para validar e vincular o usuário ao CRM da empresa sem recriar conta.',
  })
  @ApiResponse({
    status: 200,
    description: 'Acesso ativado com sucesso',
    type: CustomerRegisterResponseDto,
  })
  @ApiResponse({ status: 429, description: 'Limite de requisições excedido' })
  async activate(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() dto: ActivateCustomerAccessDto,
  ): Promise<CustomerRegisterResponseDto> {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(headers),
    });

    const sessionEmail = session?.user?.email?.trim().toLowerCase();
    if (!sessionEmail) {
      throw new UnauthorizedException('Sessão inválida ou ausente');
    }

    return this.customerAuthService.activateAccess(dto, sessionEmail);
  }
}
