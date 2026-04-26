import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CustomerGuard } from 'src/common/guards/customer.guard';
import { ParseEntityIdPipe } from 'src/common/pipes/parse-entity-id.pipe';
import { CheckoutSessionsService } from '../services/checkout-sessions.service';
import {
  CreateCheckoutSessionDto,
  CreatePaymentAttemptDto,
  UpdateCheckoutSessionDto,
} from '../dto/checkout-session.dto';

@ApiTags('Customer Checkout')
@ApiBearerAuth()
@Controller({ path: 'customer/checkout-sessions', version: '1' })
@UseGuards(JwtAuthGuard, CustomerGuard)
export class CheckoutSessionsController {
  constructor(private readonly service: CheckoutSessionsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar sessão de checkout do cliente' })
  create(@Body() dto: CreateCheckoutSessionDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar sessão de checkout' })
  findOne(@Param('id', ParseEntityIdPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar sessão de checkout' })
  update(
    @Param('id', ParseEntityIdPipe) id: string,
    @Body() dto: UpdateCheckoutSessionDto,
  ) {
    return this.service.update(id, dto);
  }

  @Post(':id/payment-attempts')
  @ApiOperation({ summary: 'Iniciar tentativa de pagamento do checkout' })
  createPaymentAttempt(
    @Param('id', ParseEntityIdPipe) id: string,
    @Body() dto: CreatePaymentAttemptDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.service.createPaymentAttempt(id, dto, idempotencyKey);
  }

  @Get(':id/payment-status')
  @ApiOperation({ summary: 'Consultar status de pagamento do checkout' })
  getPaymentStatus(@Param('id', ParseEntityIdPipe) id: string) {
    return this.service.getPaymentStatus(id);
  }
}
