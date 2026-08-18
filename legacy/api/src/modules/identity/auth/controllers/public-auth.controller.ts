import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import {
  PublicRegisterDto,
  PublicRegisterResponseDto,
} from '../dto/public-register.dto';
import { PublicRegistrationService } from '../services/public-registration.service';
import { SignupThrottle } from 'src/common/decorators/auth-throttle.decorator';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class PublicAuthController {
  constructor(
    private readonly publicRegistrationService: PublicRegistrationService,
  ) {}

  @Post('register')
  @Public()
  @SignupThrottle()
  @ApiOperation({
    summary: 'Cadastro de nova empresa com usuário administrador',
  })
  @ApiResponse({
    status: 201,
    description: 'Cadastro realizado com sucesso',
    type: PublicRegisterResponseDto,
  })
  @ApiResponse({ status: 429, description: 'Limite de requisições excedido' })
  async register(
    @Body() dto: PublicRegisterDto,
  ): Promise<PublicRegisterResponseDto> {
    return this.publicRegistrationService.register(dto);
  }
}
