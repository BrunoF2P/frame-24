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
  UseGuards,
} from '@nestjs/common';
import { ParseEntityIdPipe } from 'src/common/pipes/parse-entity-id.pipe';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
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
import { FederalTaxRatesService } from '../services/federal-tax-rates.service';
import { CreateFederalTaxRateDto } from '../dto/create-federal-tax-rate.dto';
import { UpdateFederalTaxRateDto } from '../dto/update-federal-tax-rate.dto';

@ApiTags('Tax')
@ApiBearerAuth()
@EmployeeReadThrottle()
@Controller({ path: 'tax/federal', version: '1' })
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class FederalTaxRatesController {
  constructor(private readonly service: FederalTaxRatesService) {}

  @Post()
  @EmployeeWriteThrottle()
  @RequirePermission('tax', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cadastrar taxa federal (PIS/COFINS/IRPJ/CSLL)' })
  async create(@Body() dto: CreateFederalTaxRateDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('tax', 'read')
  @ApiOperation({ summary: 'Listar taxas federais cadastradas' })
  async list() {
    return this.service.list();
  }

  @Get(':id')
  @RequirePermission('tax', 'read')
  @ApiOperation({ summary: 'Buscar taxa federal por ID' })
  @ApiParam({ name: 'id', description: 'Identificador da taxa federal' })
  async findOne(@Param('id', ParseEntityIdPipe) id: string) {
    return this.service.findById(id);
  }

  @Put(':id')
  @EmployeeWriteThrottle()
  @RequirePermission('tax', 'update')
  @ApiOperation({ summary: 'Atualizar taxa federal' })
  @ApiParam({ name: 'id', description: 'Identificador da taxa federal' })
  async update(
    @Param('id', ParseEntityIdPipe) id: string,
    @Body() dto: UpdateFederalTaxRateDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @EmployeeWriteThrottle()
  @RequirePermission('tax', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir taxa federal' })
  @ApiParam({ name: 'id', description: 'Identificador da taxa federal' })
  @ApiResponse({ status: 204, description: 'Taxa removida.' })
  async delete(@Param('id', ParseEntityIdPipe) id: string) {
    await this.service.delete(id);
  }
}
