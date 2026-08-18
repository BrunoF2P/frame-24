import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ParseEntityIdPipe } from 'src/common/pipes/parse-entity-id.pipe';
import {
  ApiBearerAuth,
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
import { ChartOfAccountsService } from '../services/chart-of-accounts.service';
import {
  CreateChartAccountDto,
  UpdateChartAccountDto,
} from '../dto/create-chart-account.dto';

@ApiTags('Plano de Contas')
@ApiBearerAuth()
@EmployeeReadThrottle()
@Controller({ path: 'finance/chart-of-accounts', version: '1' })
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class ChartOfAccountsController {
  constructor(private readonly chartService: ChartOfAccountsService) {}

  @Post()
  @EmployeeWriteThrottle()
  @RequirePermission('finance_accounts', 'create')
  @ApiOperation({ summary: 'Criar conta do plano contábil' })
  async create(@Body() dto: CreateChartAccountDto) {
    return this.chartService.create(dto);
  }

  @Get()
  @RequirePermission('finance_accounts', 'read')
  @ApiOperation({ summary: 'Listar contas do plano contábil' })
  async findAll() {
    return this.chartService.findAll();
  }

  @Put(':id')
  @EmployeeWriteThrottle()
  @RequirePermission('finance_accounts', 'update')
  @ApiOperation({ summary: 'Atualizar conta contábil' })
  async update(
    @Param('id', ParseEntityIdPipe) id: string,
    @Body() dto: UpdateChartAccountDto,
  ) {
    return this.chartService.update(id, dto);
  }

  @Delete(':id')
  @EmployeeWriteThrottle()
  @RequirePermission('finance_accounts', 'delete')
  @ApiOperation({ summary: 'Inativar conta contábil' })
  @ApiResponse({ status: 200, description: 'Conta inativada com sucesso' })
  async remove(@Param('id', ParseEntityIdPipe) id: string) {
    return this.chartService.remove(id);
  }
}
