import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ParseEntityIdPipe } from 'src/common/pipes/parse-entity-id.pipe';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthorizationGuard } from 'src/common/guards/authorization.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import {
  EmployeeReadThrottle,
  EmployeeWriteThrottle,
} from 'src/common/decorators/auth-throttle.decorator';
import { ZodValidationPipe } from 'nestjs-zod';
import { CashFlowEntriesService } from '../services/cash-flow-entries.service';
import { CreateCashFlowEntryDto } from '../dto/create-cash-flow-entry.dto';
import { CashFlowQueryDto } from '../dto/cash-flow-query.dto';

@ApiTags('Fluxo de Caixa - Lançamentos')
@ApiBearerAuth()
@EmployeeReadThrottle()
@Controller({ path: 'finance/cash-flow', version: '1' })
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class CashFlowEntriesController {
  constructor(private readonly service: CashFlowEntriesService) {}

  @Post()
  @EmployeeWriteThrottle()
  @RequirePermission('cash_flow', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new cash flow entry' })
  @ApiResponse({
    status: 201,
    description: 'Cash flow entry created successfully',
  })
  async create(@Body(new ZodValidationPipe()) dto: CreateCashFlowEntryDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('cash_flow', 'read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List cash flow entries with filters' })
  @ApiResponse({
    status: 200,
    description: 'Cash flow entries retrieved successfully',
  })
  async findAll(@Query(new ZodValidationPipe()) query: CashFlowQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @RequirePermission('cash_flow', 'read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get cash flow entry details' })
  @ApiResponse({
    status: 200,
    description: 'Cash flow entry retrieved successfully',
  })
  async findOne(@Param('id', ParseEntityIdPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post(':id/reconcile')
  @EmployeeWriteThrottle()
  @RequirePermission('cash_flow', 'update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reconcile a cash flow entry' })
  @ApiResponse({ status: 200, description: 'Entry reconciled successfully' })
  async reconcile(@Param('id', ParseEntityIdPipe) id: string) {
    return this.service.reconcile(id);
  }

  @Delete(':id')
  @EmployeeWriteThrottle()
  @RequirePermission('cash_flow', 'delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a cash flow entry' })
  @ApiResponse({ status: 200, description: 'Entry deleted successfully' })
  async delete(@Param('id', ParseEntityIdPipe) id: string) {
    return this.service.delete(id);
  }
}
