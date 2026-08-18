import {
  Controller,
  Get,
  Post,
  Patch,
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
import { BankAccountsService } from '../services/bank-accounts.service';
import { CreateBankAccountDto } from '../dto/create-bank-account.dto';
import { UpdateBankAccountDto } from '../dto/update-bank-account.dto';

@ApiTags('Fluxo de Caixa - Contas Bancárias')
@ApiBearerAuth()
@EmployeeReadThrottle()
@Controller({ path: 'finance/bank-accounts', version: '1' })
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class BankAccountsController {
  constructor(private readonly service: BankAccountsService) {}

  @Post()
  @EmployeeWriteThrottle()
  @RequirePermission('bank_accounts', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new bank account' })
  @ApiResponse({
    status: 201,
    description: 'Bank account created successfully',
  })
  async create(@Body(new ZodValidationPipe()) dto: CreateBankAccountDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('bank_accounts', 'read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all bank accounts' })
  @ApiResponse({
    status: 200,
    description: 'Bank accounts retrieved successfully',
  })
  async findAll(@Query('active_only') activeOnly?: boolean) {
    return this.service.findAll(activeOnly !== false);
  }

  @Get(':id')
  @RequirePermission('bank_accounts', 'read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get bank account details' })
  @ApiResponse({
    status: 200,
    description: 'Bank account retrieved successfully',
  })
  async findOne(@Param('id', ParseEntityIdPipe) id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/balance')
  @RequirePermission('bank_accounts', 'read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get bank account current balance' })
  @ApiResponse({ status: 200, description: 'Balance retrieved successfully' })
  async getBalance(@Param('id', ParseEntityIdPipe) id: string) {
    return this.service.getBalance(id);
  }

  @Patch(':id')
  @EmployeeWriteThrottle()
  @RequirePermission('bank_accounts', 'update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update bank account' })
  @ApiResponse({
    status: 200,
    description: 'Bank account updated successfully',
  })
  async update(
    @Param('id', ParseEntityIdPipe) id: string,
    @Body(new ZodValidationPipe()) dto: UpdateBankAccountDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @EmployeeWriteThrottle()
  @RequirePermission('bank_accounts', 'delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate bank account' })
  @ApiResponse({
    status: 200,
    description: 'Bank account deactivated successfully',
  })
  async delete(@Param('id', ParseEntityIdPipe) id: string) {
    return this.service.delete(id);
  }
}
