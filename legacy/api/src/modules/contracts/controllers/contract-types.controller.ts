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
import { ContractTypesService } from '../services/contract-types.service';
import { CreateContractTypeDto } from '../dto/create-contract-type.dto';
import { UpdateContractTypeDto } from '../dto/update-contract-type.dto';

@ApiTags('Contracts')
@ApiBearerAuth()
@EmployeeReadThrottle()
@Controller({ path: 'contracts/types', version: '1' })
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class ContractTypesController {
  constructor(private readonly service: ContractTypesService) {}

  @Post()
  @EmployeeWriteThrottle()
  @RequirePermission('contracts', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cadastrar tipo de contrato de exibição' })
  async create(@Body() dto: CreateContractTypeDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('contracts', 'read')
  @ApiOperation({ summary: 'Listar tipos de contrato' })
  async list() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermission('contracts', 'read')
  @ApiOperation({ summary: 'Buscar tipo de contrato por ID' })
  @ApiParam({ name: 'id', description: 'Identificador do tipo' })
  async findOne(@Param('id', ParseEntityIdPipe) id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  @EmployeeWriteThrottle()
  @RequirePermission('contracts', 'update')
  @ApiOperation({ summary: 'Atualizar tipo de contrato' })
  async update(
    @Param('id', ParseEntityIdPipe) id: string,
    @Body() dto: UpdateContractTypeDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @EmployeeWriteThrottle()
  @RequirePermission('contracts', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover tipo de contrato' })
  @ApiResponse({ status: 204, description: 'Tipo removido.' })
  async delete(@Param('id', ParseEntityIdPipe) id: string) {
    await this.service.delete(id);
  }
}
