import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseEntityIdPipe } from 'src/common/pipes/parse-entity-id.pipe';
import { AuthorizationGuard } from 'src/common/guards/authorization.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import {
  EmployeeReadThrottle,
  EmployeeWriteThrottle,
} from 'src/common/decorators/auth-throttle.decorator';
import { CreatePosTransactionDto } from '../dto/create-pos-transaction.dto';
import { PosTransactionResponseDto } from '../dto/pos-transaction-response.dto';
import { PosTransactionsService } from '../services/pos-transactions.service';

@ApiTags('POS - Transações')
@ApiBearerAuth()
@EmployeeReadThrottle()
@Controller({ path: 'pos-transactions', version: '1' })
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class PosTransactionsController {
  constructor(
    private readonly posTransactionsService: PosTransactionsService,
  ) {}

  @Post()
  @EmployeeWriteThrottle()
  @RequirePermission('pos_transactions', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar transação no PDV' })
  async create(
    @Body() dto: CreatePosTransactionDto,
  ): Promise<PosTransactionResponseDto> {
    return this.posTransactionsService.create(dto);
  }

  @Get('session/:pos_session_id')
  @RequirePermission('pos_transactions', 'read')
  @ApiOperation({ summary: 'Listar transações de uma sessão PDV' })
  async findBySession(
    @Param('pos_session_id', ParseEntityIdPipe) pos_session_id: string,
  ): Promise<PosTransactionResponseDto[]> {
    return this.posTransactionsService.findBySession(pos_session_id);
  }

  @Get(':id')
  @RequirePermission('pos_transactions', 'read')
  @ApiOperation({ summary: 'Buscar transação PDV por ID' })
  async findOne(
    @Param('id', ParseEntityIdPipe) id: string,
  ): Promise<PosTransactionResponseDto> {
    return this.posTransactionsService.findOne(id);
  }
}
