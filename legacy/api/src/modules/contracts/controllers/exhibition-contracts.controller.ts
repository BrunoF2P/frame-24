import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ParseEntityIdPipe,
  ParseOptionalEntityIdPipe,
} from 'src/common/pipes/parse-entity-id.pipe';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { AuthorizationGuard } from 'src/common/guards/authorization.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import {
  EmployeeReadThrottle,
  EmployeeWriteThrottle,
} from 'src/common/decorators/auth-throttle.decorator';
import { ExhibitionContractsService } from '../services/exhibition-contracts.service';
import { CreateExhibitionContractDto } from '../dto/create-exhibition-contract.dto';
import { UpdateExhibitionContractDto } from '../dto/update-exhibition-contract.dto';

@ApiTags('Contracts')
@ApiBearerAuth()
@EmployeeReadThrottle()
@Controller({ path: 'contracts/exhibition', version: '1' })
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class ExhibitionContractsController {
  constructor(private readonly service: ExhibitionContractsService) {}

  @Post()
  @EmployeeWriteThrottle()
  @RequirePermission('contracts', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cadastrar contrato de exibição' })
  async create(@Body() dto: CreateExhibitionContractDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('contracts', 'read')
  @ApiOperation({ summary: 'Listar contratos de exibição' })
  @ApiQuery({ name: 'movie_id', required: false })
  @ApiQuery({ name: 'cinema_complex_id', required: false })
  @ApiQuery({ name: 'distributor_id', required: false })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiBadRequestResponse({ description: 'Parâmetros de consulta inválidos' })
  @ApiForbiddenResponse({
    description: 'Filtro referencia recurso de outro tenant',
  })
  @ApiResponse({ status: 429, description: 'Limite de requisições excedido' })
  async list(
    @Query('movie_id', new ParseOptionalEntityIdPipe()) movie_id?: string,
    @Query('cinema_complex_id', new ParseOptionalEntityIdPipe())
    cinema_complex_id?: string,
    @Query('distributor_id', new ParseOptionalEntityIdPipe())
    distributor_id?: string,
    @Query('active') active?: string,
  ) {
    const filters = {
      movie_id,
      cinema_complex_id,
      distributor_id,
      active: active === undefined ? undefined : active === 'true',
    };

    return this.service.findAll(filters);
  }

  @Get(':id')
  @RequirePermission('contracts', 'read')
  @ApiOperation({ summary: 'Buscar contrato de exibição por ID' })
  @ApiParam({ name: 'id', description: 'Identificador do contrato' })
  async findOne(@Param('id', ParseEntityIdPipe) id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  @EmployeeWriteThrottle()
  @RequirePermission('contracts', 'update')
  @ApiOperation({ summary: 'Atualizar contrato de exibição' })
  async update(
    @Param('id', ParseEntityIdPipe) id: string,
    @Body() dto: UpdateExhibitionContractDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @EmployeeWriteThrottle()
  @RequirePermission('contracts', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desativar contrato de exibição' })
  @ApiResponse({ status: 204, description: 'Contrato desativado.' })
  async delete(@Param('id', ParseEntityIdPipe) id: string) {
    await this.service.delete(id);
  }
}
