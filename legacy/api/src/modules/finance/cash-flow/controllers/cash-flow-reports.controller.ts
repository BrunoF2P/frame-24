import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthorizationGuard } from 'src/common/guards/authorization.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { EmployeeReadThrottle } from 'src/common/decorators/auth-throttle.decorator';
import { ZodValidationPipe } from 'nestjs-zod';
import { CashFlowReportsService } from '../services/cash-flow-reports.service';
import { CashFlowReportQueryDto } from '../dto/cash-flow-report.dto';

@ApiTags('Fluxo de Caixa - Relatórios')
@ApiBearerAuth()
@EmployeeReadThrottle()
@Controller({ path: 'finance/cash-flow/reports', version: '1' })
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class CashFlowReportsController {
  constructor(private readonly service: CashFlowReportsService) {}

  @Get('daily')
  @RequirePermission('cash_flow', 'read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get daily cash flow report' })
  @ApiResponse({ status: 200, description: 'Report retrieved successfully' })
  async getDailyReport(
    @Query(new ZodValidationPipe()) query: CashFlowReportQueryDto,
  ) {
    return this.service.getDailyReport(query);
  }

  @Get('period')
  @RequirePermission('cash_flow', 'read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get cash flow report by period' })
  @ApiResponse({ status: 200, description: 'Report retrieved successfully' })
  async getPeriodReport(
    @Query(new ZodValidationPipe()) query: CashFlowReportQueryDto,
  ) {
    return this.service.getPeriodReport(query);
  }

  @Get('projection')
  @RequirePermission('cash_flow', 'read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get cash flow projection' })
  @ApiResponse({
    status: 200,
    description: 'Projection retrieved successfully',
  })
  async getProjection(
    @Query(new ZodValidationPipe()) query: CashFlowReportQueryDto,
  ) {
    return this.service.getProjection(query);
  }

  @Get('summary')
  @RequirePermission('cash_flow', 'read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get cash flow summary by category' })
  @ApiResponse({ status: 200, description: 'Summary retrieved successfully' })
  async getCategorySummary(
    @Query(new ZodValidationPipe()) query: CashFlowReportQueryDto,
  ) {
    return this.service.getCategorySummary(query);
  }
}
