import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ParseEntityIdPipe } from 'src/common/pipes/parse-entity-id.pipe';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthorizationGuard } from 'src/common/guards/authorization.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { EmployeeReadThrottle } from 'src/common/decorators/auth-throttle.decorator';
import { PosPaymentMethodsRepository } from '../repositories/pos-payment-methods.repository';
import { TenantContextService } from 'src/common/services/tenant-context.service';

@ApiTags('POS - Métodos de Pagamento')
@ApiBearerAuth()
@EmployeeReadThrottle()
@Controller({ path: 'pos-payment-methods', version: '1' })
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class PosPaymentMethodsController {
  constructor(
    private readonly posPaymentMethodsRepo: PosPaymentMethodsRepository,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Get()
  @RequirePermission('pos_payment_methods', 'read')
  @ApiOperation({ summary: 'Listar métodos de pagamento do PDV' })
  async findAll() {
    const companyId = this.tenantContext.getCompanyId();
    return this.posPaymentMethodsRepo.findAll(companyId);
  }
}
