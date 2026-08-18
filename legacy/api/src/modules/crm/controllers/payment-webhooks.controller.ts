import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { WriteThrottle } from 'src/common/decorators/auth-throttle.decorator';
import { CheckoutSessionsService } from '../services/checkout-sessions.service';
import { PaymentWebhookDto } from '../dto/checkout-session.dto';

@ApiTags('Payments')
@Controller({ path: 'payments/webhooks', version: '1' })
export class PaymentWebhooksController {
  constructor(private readonly service: CheckoutSessionsService) {}

  @Post(':provider')
  @Public()
  @WriteThrottle()
  @ApiOperation({ summary: 'Receber webhook genérico de pagamento' })
  processWebhook(
    @Param('provider') provider: string,
    @Body() dto: PaymentWebhookDto,
  ) {
    return this.service.processWebhook(provider, dto);
  }
}
