import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ParseEntityIdPipe } from 'src/common/pipes/parse-entity-id.pipe';
import { AccountsPayableService } from '../services/accounts-payable.service';
import { CreateAccountPayableDto } from '../dto/create-account-payable.dto';
import { UpdateAccountPayableDto } from '../dto/update-account-payable.dto';
import { AccountPayableQueryDto } from '../dto/account-payable-query.dto';
import { AuthorizationGuard } from 'src/common/guards/authorization.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import {
  EmployeeReadThrottle,
  EmployeeWriteThrottle,
} from 'src/common/decorators/auth-throttle.decorator';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Contas a Pagar')
@ApiBearerAuth()
@EmployeeReadThrottle()
@Controller('finance/payables')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class AccountsPayableController {
  constructor(private readonly service: AccountsPayableService) {}

  @Post()
  @EmployeeWriteThrottle()
  @RequirePermission('finance_payables', 'create')
  @ApiOperation({
    summary: 'Criar nova conta a pagar',
    description:
      'Registra uma nova conta a pagar no sistema. Pode ser vinculada a um fornecedor e categorizada por tipo de despesa (operacional, administrativa, etc).',
  })
  @ApiResponse({
    status: 201,
    description: 'Conta a pagar criada com sucesso.',
  })
  create(@Body() dto: CreateAccountPayableDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('finance_payables', 'read')
  @ApiOperation({
    summary: 'Listar contas a pagar',
    description:
      'Retorna uma lista paginada de contas a pagar, com filtros por data, status, fornecedor e complexo.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de contas a pagar retornada com sucesso.',
  })
  findAll(@Query() query: AccountPayableQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @RequirePermission('finance_payables', 'read')
  @ApiOperation({
    summary: 'Buscar conta a pagar por ID',
    description:
      'Retorna os detalhes completos de uma conta a pagar específica, incluindo histórico de transações.',
  })
  @ApiResponse({ status: 200, description: 'Detalhes da conta a pagar.' })
  @ApiResponse({ status: 404, description: 'Conta a pagar não encontrada.' })
  findOne(@Param('id', ParseEntityIdPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @EmployeeWriteThrottle()
  @RequirePermission('finance_payables', 'update')
  @ApiOperation({
    summary: 'Atualizar conta a pagar',
    description:
      'Atualiza os dados de uma conta a pagar existente. Permite alterar valores, datas e status (se permitido).',
  })
  @ApiResponse({
    status: 200,
    description: 'Conta a pagar atualizada com sucesso.',
  })
  @ApiResponse({ status: 404, description: 'Conta a pagar não encontrada.' })
  update(
    @Param('id', ParseEntityIdPipe) id: string,
    @Body() dto: UpdateAccountPayableDto,
  ) {
    return this.service.update(id, dto);
  }
}
