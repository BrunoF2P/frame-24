import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ParseOptionalEntityIdPipe } from 'src/common/pipes/parse-entity-id.pipe';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
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
import { DistributorSettlementsService } from '../services/distributor-settlements.service';
import { CreateDistributorSettlementDto } from '../dto/create-distributor-settlement.dto';

@ApiTags('Conciliações com Distribuidoras')
@ApiBearerAuth()
@EmployeeReadThrottle()
@Controller({ path: 'finance/distributor-settlements', version: '1' })
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class DistributorSettlementsController {
  constructor(
    private readonly settlementsService: DistributorSettlementsService,
  ) {}

  @Get()
  @RequirePermission('finance_settlements', 'read')
  @ApiOperation({ summary: 'Listar repasses para distribuidoras' })
  @ApiQuery({
    name: 'cinema_complex_id',
    required: false,
    description: 'Filtrar por complexo (UUID ou Snowflake)',
  })
  @ApiResponse({ status: 400, description: 'Parâmetros de consulta inválidos' })
  @ApiResponse({
    status: 403,
    description: 'Complexo informado não pertence ao tenant atual',
  })
  @ApiResponse({ status: 429, description: 'Limite de requisições excedido' })
  async findAll(
    @Query('cinema_complex_id', new ParseOptionalEntityIdPipe())
    cinema_complex_id?: string,
  ) {
    return this.settlementsService.findAll(cinema_complex_id);
  }

  @Post()
  @EmployeeWriteThrottle()
  @RequirePermission('finance_settlements', 'create')
  @ApiOperation({ summary: 'Criar/acertar repasse para distribuidor' })
  async create(@Body() dto: CreateDistributorSettlementDto) {
    return this.settlementsService.create(dto);
  }
}
