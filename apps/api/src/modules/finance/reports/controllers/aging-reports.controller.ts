import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ParseEntityIdPipe } from 'src/common/pipes/parse-entity-id.pipe';
import { AgingReportsService } from '../services/aging-reports.service';
import { PositionReportsService } from '../services/position-reports.service';
import { AgingReportQueryDto } from '../dto/aging-report-query.dto';
import {
  CustomerPositionQueryDto,
  SupplierPositionQueryDto,
} from '../dto/position-report-query.dto';
import { AuthorizationGuard } from 'src/common/guards/authorization.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { FinanceReportsService } from '../../services/finance-reports.service';

@ApiTags('Relatórios Financeiros')
@ApiBearerAuth()
@Controller('finance/reports')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class AgingReportsController {
  constructor(
    private readonly agingService: AgingReportsService,
    private readonly positionService: PositionReportsService,
    private readonly financeService: FinanceReportsService,
  ) {}

  @Get('aging/receivables')
  @RequirePermission('finance_reports', 'read')
  @ApiOperation({
    summary: 'Relatório de Aging de Contas a Receber',
    description:
      'Gera relatório de inadimplência de clientes (Aging List), agrupando títulos por faixas de atraso (0-30, 31-60, etc).',
  })
  @ApiResponse({ status: 200, description: 'Relatório gerado com sucesso.' })
  getReceivablesAging(@Query() query: AgingReportQueryDto) {
    return this.agingService.getReceivablesAging(query);
  }

  @Get('aging/payables')
  @RequirePermission('finance_reports', 'read')
  @ApiOperation({
    summary: 'Relatório de Aging de Contas a Pagar',
    description:
      'Gera relatório de contas a pagar em aberto (Aging List), agrupando títulos por faixas de vencimento.',
  })
  @ApiResponse({ status: 200, description: 'Relatório gerado com sucesso.' })
  getPayablesAging(@Query() query: AgingReportQueryDto) {
    return this.agingService.getPayablesAging(query);
  }

  @Get('customer-position')
  @RequirePermission('finance_reports', 'read')
  @ApiOperation({
    summary: 'Relatório de Posição de Clientes',
    description:
      'Visão consolidada da situação financeira de todos os clientes (total devido, vencido, ticket médio).',
  })
  @ApiResponse({ status: 200, description: 'Relatório gerado com sucesso.' })
  getCustomerPosition(@Query() query: CustomerPositionQueryDto) {
    return this.positionService.getCustomerPosition(query);
  }

  @Get('customer-position/:customer_id')
  @RequirePermission('finance_reports', 'read')
  @ApiOperation({
    summary: 'Posição Detalhada de Cliente',
    description:
      'Extrato detalhado de um cliente específico, listando todos os títulos e histórico de pagamentos.',
  })
  @ApiResponse({ status: 200, description: 'Detalhes retornados com sucesso.' })
  getCustomerPositionById(
    @Param('customer_id', ParseEntityIdPipe) customer_id: string,
  ) {
    return this.positionService.getCustomerPositionById(customer_id);
  }

  @Get('supplier-position')
  @RequirePermission('finance_reports', 'read')
  @ApiOperation({
    summary: 'Relatório de Posição de Fornecedores',
    description:
      'Visão consolidada da situação financeira de todos os fornecedores (total a pagar, vencido).',
  })
  @ApiResponse({ status: 200, description: 'Relatório gerado com sucesso.' })
  getSupplierPosition(@Query() query: SupplierPositionQueryDto) {
    return this.positionService.getSupplierPosition(query);
  }

  @Get('supplier-position/:supplier_id')
  @RequirePermission('finance_reports', 'read')
  @ApiOperation({
    summary: 'Posição Detalhada de Fornecedor',
    description:
      'Extrato detalhado de um fornecedor específico, listando todos os títulos e histórico de pagamentos.',
  })
  @ApiResponse({ status: 200, description: 'Detalhes retornados com sucesso.' })
  getSupplierPositionById(
    @Param('supplier_id', ParseEntityIdPipe) supplier_id: string,
  ) {
    return this.positionService.getSupplierPositionById(supplier_id);
  }

  @Get('income-statement')
  @RequirePermission('finance_reports', 'read')
  @ApiOperation({
    summary: 'DRE - Demonstrativo de Resultado do Exercício',
    description:
      'Gera a DRE (Demonstrativo de Resultado do Exercício) consolidada para o mês informado, calculando Receita, Custos, Despesas e Lucro Líquido.',
  })
  @ApiQuery({
    name: 'month',
    required: true,
    example: '2025-11',
    description: 'Mês de competência (YYYY-MM)',
  })
  @ApiResponse({ status: 200, description: 'DRE gerada com sucesso.' })
  getIncomeStatement(@Query('month') month: string) {
    return this.financeService.getIncomeStatement(month);
  }
}
