import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  PublicRegisterDto,
  PublicRegisterResponseDto,
} from '../dto/public-register.dto';
import { PublicRegistrationService } from '../services/public-registration.service';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class PublicAuthController {
  constructor(
    private readonly publicRegistrationService: PublicRegistrationService,
  ) {}

  @Post('register')
  @ApiOperation({
    summary: 'Cadastro de nova empresa com usuário administrador',
  })
  @ApiResponse({
    status: 201,
    description: 'Cadastro realizado com sucesso',
    type: PublicRegisterResponseDto,
  })
  async register(
    @Body() dto: PublicRegisterDto,
  ): Promise<PublicRegisterResponseDto> {
    return this.publicRegistrationService.register(dto);
  }
}
