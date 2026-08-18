import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthorizationGuard } from 'src/common/guards/authorization.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import {
  EmployeeReadThrottle,
  EmployeeWriteThrottle,
} from 'src/common/decorators/auth-throttle.decorator';
import { PromotionTypesService } from '../services/promotion-types.service';
import {
  CreatePromotionTypeDto,
  PromotionTypeResponseDto,
} from '../dto/create-promotion-type.dto';

@ApiTags('Promotion Types')
@ApiBearerAuth()
@EmployeeReadThrottle()
@Controller({ path: 'promotion-types', version: '1' })
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class PromotionTypesController {
  constructor(private readonly promotionTypesService: PromotionTypesService) {}

  @Get()
  @RequirePermission('campaigns', 'read')
  @ApiOperation({
    summary: 'Listar tipos de promoção da empresa',
  })
  @ApiOkResponse({
    description: 'Lista de tipos cadastrados.',
    type: PromotionTypeResponseDto,
    isArray: true,
  })
  async findAll() {
    return this.promotionTypesService.findAll();
  }

  @Post()
  @EmployeeWriteThrottle()
  @RequirePermission('campaigns', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar tipo de promoção',
    description:
      'Registra um novo tipo de promoção para ser usado nas campanhas.',
  })
  @ApiResponse({
    status: 201,
    description: 'Tipo de promoção criado com sucesso.',
    type: PromotionTypeResponseDto,
  })
  async create(@Body() dto: CreatePromotionTypeDto) {
    return this.promotionTypesService.create(dto);
  }
}
