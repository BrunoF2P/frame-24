import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { TransactionsService } from '../services/transactions.service';
import { CreateReceivableTransactionDto } from '../dto/create-receivable-transaction.dto';
import { CreatePayableTransactionDto } from '../dto/create-payable-transaction.dto';
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

@ApiTags('Transações')
@ApiBearerAuth()
@EmployeeReadThrottle()
@Controller('finance/transactions')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Post('receivables/settle')
  @EmployeeWriteThrottle()
  @RequirePermission('finance_receivables', 'update')
  @ApiOperation({
    summary: 'Liquidar conta a receber',
    description:
      'Liquida (baixa) uma conta a receber, registrando a entrada de dinheiro no fluxo de caixa. Permite pagamentos parciais e aplicação de juros/multas.',
  })
  @ApiResponse({
    status: 201,
    description: 'Transação de recebimento registrada com sucesso.',
  })
  settleReceivable(@Body() dto: CreateReceivableTransactionDto) {
    return this.service.settleReceivable(dto);
  }

  @Post('payables/settle')
  @EmployeeWriteThrottle()
  @RequirePermission('finance_payables', 'update')
  @ApiOperation({
    summary: 'Liquidar conta a pagar',
    description:
      'Liquida (baixa) uma conta a pagar, registrando a saída de dinheiro do fluxo de caixa. Permite pagamentos parciais e aplicação de juros/multas.',
  })
  @ApiResponse({
    status: 201,
    description: 'Transação de pagamento registrada com sucesso.',
  })
  settlePayable(@Body() dto: CreatePayableTransactionDto) {
    return this.service.settlePayable(dto);
  }
}
