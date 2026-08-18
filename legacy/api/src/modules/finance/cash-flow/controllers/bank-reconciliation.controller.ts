import {
  Controller,
  Get,
  Post,
  Patch,
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
import { BankReconciliationService } from '../services/bank-reconciliation.service';
import {
  CreateBankReconciliationDto,
  UpdateBankReconciliationDto,
} from '../dto/bank-reconciliation.dto';

@ApiTags('Fluxo de Caixa - Conciliação Bancária')
@ApiBearerAuth()
@EmployeeReadThrottle()
@Controller({ path: 'finance/bank-reconciliation', version: '1' })
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class BankReconciliationController {
  constructor(private readonly service: BankReconciliationService) {}

  @Post()
  @EmployeeWriteThrottle()
  @RequirePermission('cash_flow', 'reconcile')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start a new bank reconciliation' })
  @ApiResponse({
    status: 201,
    description: 'Reconciliation created successfully',
  })
  async create(
    @Body(new ZodValidationPipe()) dto: CreateBankReconciliationDto,
  ) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('cash_flow', 'read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List bank reconciliations' })
  @ApiResponse({
    status: 200,
    description: 'Reconciliations retrieved successfully',
  })
  async findAll(@Query('bank_account_id') bankAccountId?: string) {
    return this.service.findAll(bankAccountId);
  }

  @Get(':id')
  @RequirePermission('cash_flow', 'read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get reconciliation details' })
  @ApiResponse({
    status: 200,
    description: 'Reconciliation retrieved successfully',
  })
  async findOne(@Param('id', ParseEntityIdPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @EmployeeWriteThrottle()
  @RequirePermission('cash_flow', 'reconcile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update reconciliation' })
  @ApiResponse({
    status: 200,
    description: 'Reconciliation updated successfully',
  })
  async update(
    @Param('id', ParseEntityIdPipe) id: string,
    @Body(new ZodValidationPipe()) dto: UpdateBankReconciliationDto,
  ) {
    return this.service.update(id, dto);
  }

  @Post(':id/complete')
  @EmployeeWriteThrottle()
  @RequirePermission('cash_flow', 'reconcile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete reconciliation' })
  @ApiResponse({
    status: 200,
    description: 'Reconciliation completed successfully',
  })
  async complete(@Param('id', ParseEntityIdPipe) id: string) {
    return this.service.complete(id);
  }
}
