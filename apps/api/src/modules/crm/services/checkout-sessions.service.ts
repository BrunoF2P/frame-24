import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ClsService } from 'nestjs-cls';
import { Prisma } from '@repo/db';
import { PrismaService } from 'src/prisma/prisma.service';
import { SalesService } from 'src/modules/sales/services/sales.service';
import { TicketsService } from 'src/modules/sales/services/tickets.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import {
  CheckoutConcessionInput,
  CheckoutTicketInput,
  CreateCheckoutSessionDto,
  CreatePaymentAttemptDto,
  PaymentWebhookDto,
  UpdateCheckoutSessionDto,
} from '../dto/checkout-session.dto';

type CheckoutWithRelations = Prisma.checkout_sessionsGetPayload<{
  include: {
    checkout_session_tickets: true;
    checkout_session_concessions: true;
    payment_attempts: true;
  };
}>;

type PaymentAttempt = Prisma.payment_attemptsGetPayload<object>;

type CheckoutContext = {
  companyId: string;
  customerId: string;
  tenantSlug?: string;
};

@Injectable()
export class CheckoutSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly salesService: SalesService,
    private readonly ticketsService: TicketsService,
    private readonly snowflake: SnowflakeService,
    private readonly cls: ClsService,
  ) {}

  private getContext(): CheckoutContext {
    const companyId = this.cls.get<string>('companyId');
    const customerId = this.cls.get<string>('customerId');
    const tenantSlug = this.cls.get<string>('tenantSlug');

    if (!companyId || !customerId) {
      throw new ForbiddenException('Contexto do cliente não encontrado.');
    }

    return { companyId, customerId, tenantSlug };
  }

  async create(dto: CreateCheckoutSessionDto) {
    const context = this.getContext();
    const company = await this.assertTenant(context, dto.tenant_slug);
    const showtime = await this.getShowtimeForCompany(
      context.companyId,
      dto.showtime_id,
    );
    const tickets = await this.normalizeTickets(
      context.companyId,
      dto.showtime_id,
      dto.reservation_uuid,
      dto.tickets,
    );
    const concessions = await this.normalizeConcessions(
      context.companyId,
      showtime.cinema_complex_id,
      dto.concession_items ?? [],
    );
    const totals = this.calculateTotals(tickets, concessions);

    await this.validateStock(concessions);

    const checkout = await this.prisma.checkout_sessions.create({
      data: {
        id: this.snowflake.generate(),
        company_id: context.companyId,
        customer_id: context.customerId,
        tenant_slug: company.tenant_slug,
        showtime_id: showtime.id,
        cinema_complex_id: showtime.cinema_complex_id,
        reservation_uuid: dto.reservation_uuid,
        status: 'ready',
        fiscal_cpf: this.normalizeCpf(dto.fiscal_cpf),
        promotion_code: dto.promotion_code || null,
        subtotal_amount: totals.subtotal,
        discount_amount: totals.discount,
        total_amount: totals.total,
        expires_at: tickets.expiresAt,
        checkout_session_tickets: {
          create: tickets.items.map((ticket) => ({
            id: this.snowflake.generate(),
            showtime_id: dto.showtime_id,
            seat_id: ticket.seat_id,
            ticket_type: ticket.ticket_type,
            face_value: ticket.face_value,
            service_fee: ticket.service_fee,
            total_amount: ticket.total_amount,
          })),
        },
        checkout_session_concessions: {
          create: concessions.map((item) => ({
            id: this.snowflake.generate(),
            complex_id: showtime.cinema_complex_id,
            item_type: item.item_type,
            item_id: item.item_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
          })),
        },
      },
      include: this.checkoutInclude(),
    });

    return this.mapCheckout(checkout);
  }

  async findOne(id: string) {
    const context = this.getContext();
    const checkout = await this.findCheckoutForCustomer(id, context);
    return this.mapCheckout(checkout);
  }

  async update(id: string, dto: UpdateCheckoutSessionDto) {
    const context = this.getContext();
    const current = await this.findCheckoutForCustomer(id, context);
    this.assertCheckoutEditable(current);

    const ticketInputs =
      dto.tickets ??
      current.checkout_session_tickets.map((ticket) => ({
        seat_id: ticket.seat_id,
        ticket_type: ticket.ticket_type ?? undefined,
      }));
    const concessionInputs =
      dto.concession_items ??
      current.checkout_session_concessions.map((item) => ({
        item_type: item.item_type,
        item_id: item.item_id,
        quantity: item.quantity,
      }));

    const tickets = await this.normalizeTickets(
      context.companyId,
      current.showtime_id,
      current.reservation_uuid,
      ticketInputs,
    );
    const concessions = await this.normalizeConcessions(
      context.companyId,
      current.cinema_complex_id,
      concessionInputs,
    );
    const totals = this.calculateTotals(tickets, concessions);
    await this.validateStock(concessions);

    const checkout = await this.prisma.$transaction(async (tx) => {
      await tx.checkout_session_tickets.deleteMany({
        where: { checkout_session_id: id },
      });
      await tx.checkout_session_concessions.deleteMany({
        where: { checkout_session_id: id },
      });

      return tx.checkout_sessions.update({
        where: { id },
        data: {
          fiscal_cpf:
            dto.fiscal_cpf !== undefined
              ? this.normalizeCpf(dto.fiscal_cpf)
              : current.fiscal_cpf,
          promotion_code:
            dto.promotion_code !== undefined
              ? dto.promotion_code || null
              : current.promotion_code,
          subtotal_amount: totals.subtotal,
          discount_amount: totals.discount,
          total_amount: totals.total,
          expires_at: tickets.expiresAt,
          status: 'ready',
          checkout_session_tickets: {
            create: tickets.items.map((ticket) => ({
              id: this.snowflake.generate(),
              showtime_id: current.showtime_id,
              seat_id: ticket.seat_id,
              ticket_type: ticket.ticket_type,
              face_value: ticket.face_value,
              service_fee: ticket.service_fee,
              total_amount: ticket.total_amount,
            })),
          },
          checkout_session_concessions: {
            create: concessions.map((item) => ({
              id: this.snowflake.generate(),
              complex_id: current.cinema_complex_id,
              item_type: item.item_type,
              item_id: item.item_id,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
            })),
          },
        },
        include: this.checkoutInclude(),
      });
    });

    return this.mapCheckout(checkout);
  }

  async createPaymentAttempt(
    checkoutId: string,
    dto: CreatePaymentAttemptDto,
    idempotencyKey?: string,
  ) {
    const context = this.getContext();
    const checkout = await this.findCheckoutForCustomer(checkoutId, context);
    this.assertCheckoutPayable(checkout);
    await this.validateStock(
      checkout.checkout_session_concessions.map((item) => ({
        item_type: item.item_type,
        item_id: item.item_id,
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
        total_price: Number(item.total_price),
        complex_id: item.complex_id,
      })),
    );

    const paymentMethod = await this.resolvePaymentMethod(
      context.companyId,
      dto.method,
    );
    const provider = dto.provider || 'internal';

    if (idempotencyKey) {
      const existing = await this.prisma.payment_attempts.findFirst({
        where: {
          checkout_session_id: checkout.id,
          provider,
          idempotency_key: idempotencyKey,
        },
      });
      if (existing) {
        return this.mapPaymentAttempt(existing, checkout);
      }
    }

    const initialStatus =
      dto.simulate_status ??
      (this.isPix(paymentMethod.name) ? 'pending' : 'paid');
    const providerReference = `${provider}_${randomUUID()}`;
    const paymentData =
      initialStatus === 'pending'
        ? {
            pix_qr_code: `FRAME24-PIX-${providerReference}`,
            pix_copy_paste: `000201FRAME24${providerReference}`,
          }
        : {};

    const attempt = await this.prisma.payment_attempts.create({
      data: {
        id: this.snowflake.generate(),
        checkout_session_id: checkout.id,
        provider,
        method: paymentMethod.name,
        status: initialStatus,
        amount: Number(checkout.total_amount),
        currency: checkout.currency,
        provider_reference: providerReference,
        idempotency_key: idempotencyKey || null,
        payment_data_json: JSON.stringify(paymentData),
        paid_at: initialStatus === 'paid' ? new Date() : null,
        expires_at:
          initialStatus === 'pending'
            ? new Date(Date.now() + 15 * 60 * 1000)
            : null,
      },
    });

    await this.prisma.checkout_sessions.update({
      where: { id: checkout.id },
      data: {
        status:
          initialStatus === 'paid'
            ? 'processing'
            : this.mapPaymentStatusToCheckoutStatus(initialStatus),
      },
    });

    if (initialStatus === 'paid') {
      const finalized = await this.finalizePaidAttempt(attempt.id);
      return this.mapPaymentAttempt(finalized.attempt, finalized.checkout);
    }
    if (['failed', 'expired'].includes(initialStatus)) {
      await this.releaseReservationForCheckout(checkout);
    }

    const refreshed = await this.findCheckoutForCustomer(checkout.id, context);
    return this.mapPaymentAttempt(attempt, refreshed);
  }

  async getPaymentStatus(checkoutId: string) {
    const context = this.getContext();
    const checkout = await this.findCheckoutForCustomer(checkoutId, context);
    const latest = this.latestAttempt(checkout);
    return {
      checkout_id: checkout.id,
      checkout_status: checkout.status,
      sale_id: checkout.sale_id,
      public_reference: checkout.public_reference,
      payment: latest ? this.mapPaymentAttempt(latest, checkout) : null,
    };
  }

  async processWebhook(provider: string, dto: PaymentWebhookDto) {
    const externalEventId =
      dto.external_event_id || `${dto.provider_reference}:${dto.status}`;
    const payload = JSON.stringify(dto);

    const existing = await this.prisma.payment_webhook_events.findUnique({
      where: {
        provider_external_event_id: {
          provider,
          external_event_id: externalEventId,
        },
      },
    });

    if (existing?.status === 'processed') {
      return { processed: true, duplicate: true };
    }

    const event =
      existing ??
      (await this.prisma.payment_webhook_events.create({
        data: {
          id: this.snowflake.generate(),
          provider,
          external_event_id: externalEventId,
          provider_reference: dto.provider_reference,
          status: 'received',
          payload_json: payload,
        },
      }));

    try {
      const attempt = await this.prisma.payment_attempts.findFirst({
        where: {
          provider,
          provider_reference: dto.provider_reference,
        },
      });
      if (!attempt) {
        throw new NotFoundException('Tentativa de pagamento não encontrada.');
      }

      let finalizedCheckout: CheckoutWithRelations | null = null;
      let updatedAttempt: PaymentAttempt = attempt;

      if (dto.status === 'paid') {
        const result = await this.finalizePaidAttempt(attempt.id, dto);
        updatedAttempt = result.attempt;
        finalizedCheckout = result.checkout;
      } else {
        updatedAttempt = await this.prisma.payment_attempts.update({
          where: { id: attempt.id },
          data: {
            status: dto.status,
            error_code: dto.error_code || null,
            error_message: dto.error_message || null,
            payment_data_json: dto.payment_data
              ? JSON.stringify(dto.payment_data)
              : attempt.payment_data_json,
          },
        });
        finalizedCheckout = await this.prisma.checkout_sessions.update({
          where: { id: attempt.checkout_session_id },
          data: {
            status: this.mapPaymentStatusToCheckoutStatus(dto.status),
          },
          include: this.checkoutInclude(),
        });
        if (['failed', 'expired'].includes(dto.status)) {
          await this.releaseReservationForCheckout(finalizedCheckout);
        }
      }

      await this.prisma.payment_webhook_events.update({
        where: { id: event.id },
        data: {
          status: 'processed',
          processed_at: new Date(),
          payload_json: payload,
        },
      });

      return {
        processed: true,
        duplicate: false,
        payment: this.mapPaymentAttempt(updatedAttempt, finalizedCheckout),
      };
    } catch (error) {
      await this.prisma.payment_webhook_events.update({
        where: { id: event.id },
        data: {
          status: 'failed',
          error_message:
            error instanceof Error ? error.message : 'Erro desconhecido',
          payload_json: payload,
        },
      });
      throw error;
    }
  }

  private async finalizePaidAttempt(
    attemptId: string,
    webhook?: PaymentWebhookDto,
  ): Promise<{ attempt: PaymentAttempt; checkout: CheckoutWithRelations }> {
    const attempt = await this.prisma.payment_attempts.findUnique({
      where: { id: attemptId },
    });
    if (!attempt) {
      throw new NotFoundException('Tentativa de pagamento não encontrada.');
    }

    let checkout = await this.prisma.checkout_sessions.findUnique({
      where: { id: attempt.checkout_session_id },
      include: this.checkoutInclude(),
    });
    if (!checkout) {
      throw new NotFoundException('Checkout não encontrado.');
    }

    if (checkout.sale_id) {
      const updatedAttempt = await this.prisma.payment_attempts.update({
        where: { id: attempt.id },
        data: {
          status: 'paid',
          paid_at: attempt.paid_at ?? new Date(),
          sale_id: checkout.sale_id,
          payment_data_json: webhook?.payment_data
            ? JSON.stringify(webhook.payment_data)
            : attempt.payment_data_json,
        },
      });
      return { attempt: updatedAttempt, checkout };
    }

    this.assertCheckoutPayable(checkout, { allowProcessing: true });

    const concessions = checkout.checkout_session_concessions.map((item) => ({
      item_type: item.item_type,
      item_id: item.item_id,
      quantity: item.quantity,
      unit_price: Number(item.unit_price),
      total_price: Number(item.total_price),
      complex_id: item.complex_id,
    }));

    await this.validateStock(concessions);
    const salePaymentMethod = await this.resolvePaymentMethod(
      checkout.company_id,
      attempt.method,
    );

    const sale = await this.salesService.create(
      {
        cinema_complex_id: checkout.cinema_complex_id,
        customer_id: checkout.customer_id,
        reservation_uuid: checkout.reservation_uuid,
        payment_method: salePaymentMethod.id,
        promotion_code: checkout.promotion_code ?? undefined,
        tickets: checkout.checkout_session_tickets.map((ticket) => ({
          showtime_id: ticket.showtime_id,
          seat_id: ticket.seat_id,
          ticket_type: ticket.ticket_type ?? undefined,
        })),
        concession_items: concessions.map((item) => ({
          item_type: item.item_type,
          item_id: item.item_id,
          quantity: item.quantity,
        })),
        discount_amount: Number(checkout.discount_amount || 0),
      },
      {
        companyId: checkout.company_id,
        customerId: checkout.customer_id,
        sessionContext: 'CUSTOMER',
      },
    );

    await this.decrementStockForSale(checkout.company_id, sale.id, concessions);

    const updatedAttempt = await this.prisma.payment_attempts.update({
      where: { id: attempt.id },
      data: {
        status: 'paid',
        sale_id: sale.id,
        paid_at: attempt.paid_at ?? new Date(),
        payment_data_json: webhook?.payment_data
          ? JSON.stringify(webhook.payment_data)
          : attempt.payment_data_json,
      },
    });

    checkout = await this.prisma.checkout_sessions.update({
      where: { id: checkout.id },
      data: {
        status: 'paid',
        sale_id: sale.id,
        public_reference: sale.public_reference ?? sale.id,
      },
      include: this.checkoutInclude(),
    });

    return { attempt: updatedAttempt, checkout };
  }

  private async assertTenant(context: CheckoutContext, tenantSlug: string) {
    const company = await this.prisma.companies.findUnique({
      where: { tenant_slug: tenantSlug },
    });
    if (!company || !company.active || company.suspended) {
      throw new NotFoundException('Empresa não encontrada.');
    }
    if (company.id !== context.companyId) {
      throw new ForbiddenException('Checkout pertence a outro tenant.');
    }
    return company;
  }

  private async getShowtimeForCompany(companyId: string, showtimeId: string) {
    const showtime = await this.prisma.showtime_schedule.findFirst({
      where: {
        id: showtimeId,
        cinema_complexes: { company_id: companyId },
      },
    });
    if (!showtime) {
      throw new NotFoundException('Sessão não encontrada.');
    }
    if (showtime.start_time < new Date()) {
      throw new BadRequestException('A sessão já começou.');
    }
    return showtime;
  }

  private async normalizeTickets(
    companyId: string,
    showtimeId: string,
    reservationUuid: string,
    tickets: CheckoutTicketInput[],
  ) {
    const seatIds = tickets.map((ticket) => ticket.seat_id);
    const uniqueSeatIds = new Set(seatIds);
    if (uniqueSeatIds.size !== seatIds.length) {
      throw new BadRequestException('Assentos duplicados no checkout.');
    }

    const reservations = await this.prisma.session_seat_status.findMany({
      where: {
        showtime_id: showtimeId,
        seat_id: { in: seatIds },
        reservation_uuid: reservationUuid,
        sale_id: null,
        expiration_date: { gt: new Date() },
      },
    });

    if (reservations.length !== seatIds.length) {
      throw new ConflictException(
        'Reserva expirada, incompleta ou pertencente a outro checkout.',
      );
    }

    await this.ticketsService.validateAndReserveSeats({
      showtimeId,
      seatIds,
      reservationUuid,
      context: { companyId },
    });

    const expiresAt = reservations.reduce<Date>(
      (earliest, item) =>
        item.expiration_date && item.expiration_date < earliest
          ? item.expiration_date
          : earliest,
      reservations[0]?.expiration_date ?? new Date(Date.now() + 15 * 60 * 1000),
    );

    const items = await Promise.all(
      tickets.map(async (ticket) => {
        const pricing = await this.ticketsService.calculateTicketPrice({
          showtimeId,
          seatId: ticket.seat_id,
          ticketTypeId: ticket.ticket_type,
          context: { companyId },
        });
        return {
          ...ticket,
          face_value: pricing.face_value,
          service_fee: pricing.service_fee,
          total_amount: pricing.total_amount,
        };
      }),
    );

    return { items, expiresAt };
  }

  private async normalizeConcessions(
    companyId: string,
    complexId: string,
    concessions: CheckoutConcessionInput[],
  ) {
    const normalized = [];

    for (const item of concessions) {
      if (item.item_type === 'COMBO') {
        const combo = await this.prisma.combos.findFirst({
          where: {
            id: item.item_id,
            company_id: companyId,
            active: true,
          },
        });
        if (!combo) {
          throw new NotFoundException('Combo não encontrado.');
        }
        const price = Number(combo.promotional_price ?? combo.sale_price);
        normalized.push({
          item_type: 'COMBO' as const,
          item_id: item.item_id,
          quantity: item.quantity,
          unit_price: price,
          total_price: price * item.quantity,
          complex_id: complexId,
        });
        continue;
      }

      const product = await this.prisma.products.findFirst({
        where: {
          id: item.item_id,
          company_id: companyId,
          active: true,
          is_available_online: true,
        },
      });
      if (!product) {
        throw new NotFoundException('Produto não encontrado.');
      }

      const price = await this.prisma.product_prices.findFirst({
        where: {
          product_id: product.id,
          complex_id: complexId,
          active: true,
          valid_from: { lte: new Date() },
          OR: [{ valid_to: { gte: new Date() } }, { valid_to: null }],
        },
        orderBy: { valid_from: 'desc' },
      });
      if (!price) {
        throw new NotFoundException(
          `Preço ativo não encontrado para ${product.name}.`,
        );
      }

      normalized.push({
        item_type: 'PRODUCT' as const,
        item_id: item.item_id,
        quantity: item.quantity,
        unit_price: Number(price.sale_price),
        total_price: Number(price.sale_price) * item.quantity,
        complex_id: complexId,
      });
    }

    return normalized;
  }

  private calculateTotals(
    tickets: Awaited<ReturnType<CheckoutSessionsService['normalizeTickets']>>,
    concessions: Awaited<
      ReturnType<CheckoutSessionsService['normalizeConcessions']>
    >,
  ) {
    const subtotal =
      tickets.items.reduce((sum, item) => sum + item.total_amount, 0) +
      concessions.reduce((sum, item) => sum + item.total_price, 0);
    return {
      subtotal,
      discount: 0,
      total: subtotal,
    };
  }

  private async validateStock(
    concessions: Array<{
      item_type: 'PRODUCT' | 'COMBO';
      item_id: string;
      quantity: number;
      complex_id: string;
    }>,
  ) {
    const productQuantities = new Map<string, { quantity: number; complexId: string }>();

    for (const item of concessions) {
      if (item.item_type === 'PRODUCT') {
        const current = productQuantities.get(item.item_id);
        productQuantities.set(item.item_id, {
          quantity: (current?.quantity ?? 0) + item.quantity,
          complexId: item.complex_id,
        });
      }
    }

    for (const [productId, demand] of productQuantities) {
      const stock = await this.prisma.product_stock.findUnique({
        where: {
          product_id_complex_id: {
            product_id: productId,
            complex_id: demand.complexId,
          },
        },
      });
      if (!stock || (stock.current_quantity ?? 0) < demand.quantity) {
        throw new ConflictException('Estoque insuficiente para um ou mais itens.');
      }
    }
  }

  private async decrementStockForSale(
    companyId: string,
    saleId: string,
    concessions: Array<{
      item_type: 'PRODUCT' | 'COMBO';
      item_id: string;
      quantity: number;
      unit_price: number;
      complex_id: string;
    }>,
  ) {
    const movementType = await this.prisma.stock_movement_types.upsert({
      where: {
        company_id_name: {
          company_id: companyId,
          name: 'Venda Online',
        },
      },
      create: {
        id: this.snowflake.generate(),
        company_id: companyId,
        name: 'Venda Online',
        description: 'Baixa automática de estoque por venda online',
        affects_stock: true,
        operation_type: 'OUT',
      },
      update: {},
    });

    for (const item of concessions) {
      if (item.item_type !== 'PRODUCT') {
        continue;
      }

      const stock = await this.prisma.product_stock.findUnique({
        where: {
          product_id_complex_id: {
            product_id: item.item_id,
            complex_id: item.complex_id,
          },
        },
      });
      const previousQuantity = stock?.current_quantity ?? 0;
      const currentQuantity = previousQuantity - item.quantity;

      if (currentQuantity < 0) {
        throw new ConflictException('Estoque insuficiente para finalizar venda.');
      }

      const updated = await this.prisma.product_stock.updateMany({
        where: {
          product_id: item.item_id,
          complex_id: item.complex_id,
          current_quantity: { gte: item.quantity },
        },
        data: {
          current_quantity: { decrement: item.quantity },
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Estoque alterado durante o pagamento.');
      }

      await this.prisma.stock_movements.create({
        data: {
          id: this.snowflake.generate(),
          product_id: item.item_id,
          complex_id: item.complex_id,
          stock_movement_types: { connect: { id: movementType.id } },
          quantity: -Math.abs(item.quantity),
          previous_quantity: previousQuantity,
          current_quantity: currentQuantity,
          origin_type: 'SALE',
          origin_id: saleId,
          unit_value: item.unit_price,
          total_value: item.unit_price * item.quantity,
          observations: 'Baixa automática do checkout web',
          movement_date: new Date(),
        },
      });
    }
  }

  private async findCheckoutForCustomer(
    id: string,
    context: CheckoutContext,
  ): Promise<CheckoutWithRelations> {
    const checkout = await this.prisma.checkout_sessions.findFirst({
      where: {
        id,
        company_id: context.companyId,
        customer_id: context.customerId,
      },
      include: this.checkoutInclude(),
    });
    if (!checkout) {
      throw new NotFoundException('Checkout não encontrado.');
    }
    return checkout;
  }

  private checkoutInclude() {
    return {
      checkout_session_tickets: true,
      checkout_session_concessions: true,
      payment_attempts: {
        orderBy: { created_at: 'desc' as const },
      },
    };
  }

  private assertCheckoutEditable(
    checkout: CheckoutWithRelations,
    options?: { allowProcessing?: boolean },
  ) {
    if (
      checkout.status === 'paid' ||
      (checkout.status === 'processing' && !options?.allowProcessing)
    ) {
      throw new BadRequestException('Checkout não pode mais ser alterado.');
    }
    if (checkout.expires_at <= new Date()) {
      throw new BadRequestException('Checkout expirado.');
    }
  }

  private assertCheckoutPayable(
    checkout: CheckoutWithRelations,
    options?: { allowProcessing?: boolean },
  ) {
    this.assertCheckoutEditable(checkout, options);
    if (checkout.checkout_session_tickets.length === 0) {
      throw new BadRequestException('Checkout sem ingressos.');
    }
    if (Number(checkout.total_amount) <= 0) {
      throw new BadRequestException('Valor inválido para pagamento.');
    }
  }

  private async resolvePaymentMethod(companyId: string, method: string) {
    const direct = await this.prisma.payment_methods.findFirst({
      where: { id: method, company_id: companyId },
    });
    if (direct) {
      return direct;
    }

    const all = await this.prisma.payment_methods.findMany({
      where: { company_id: companyId },
    });
    const normalized = this.normalize(method);
    const found = all.find((item) => this.normalize(item.name).includes(normalized));
    if (!found) {
      throw new NotFoundException('Método de pagamento inválido.');
    }
    return found;
  }

  private mapPaymentStatusToCheckoutStatus(status: string) {
    if (status === 'paid') return 'paid';
    if (status === 'failed') return 'payment_failed';
    if (status === 'expired') return 'expired';
    return 'payment_pending';
  }

  private async releaseReservationForCheckout(
    checkout: Pick<
      CheckoutWithRelations,
      'company_id' | 'showtime_id' | 'reservation_uuid'
    >,
  ) {
    const availableStatus = await this.prisma.seat_status.findUnique({
      where: {
        company_id_name: {
          company_id: checkout.company_id,
          name: 'Disponível',
        },
      },
    });
    if (!availableStatus) {
      return;
    }

    await this.prisma.session_seat_status.updateMany({
      where: {
        showtime_id: checkout.showtime_id,
        reservation_uuid: checkout.reservation_uuid,
        sale_id: null,
      },
      data: {
        status: availableStatus.id,
        reservation_uuid: null,
        reservation_date: null,
        expiration_date: null,
      },
    });
  }

  private isPix(name: string) {
    return this.normalize(name).includes('pix');
  }

  private latestAttempt(checkout: CheckoutWithRelations) {
    return checkout.payment_attempts[0] ?? null;
  }

  private mapCheckout(checkout: CheckoutWithRelations) {
    return {
      id: checkout.id,
      company_id: checkout.company_id,
      customer_id: checkout.customer_id,
      tenant_slug: checkout.tenant_slug,
      showtime_id: checkout.showtime_id,
      cinema_complex_id: checkout.cinema_complex_id,
      reservation_uuid: checkout.reservation_uuid,
      status: checkout.status,
      currency: checkout.currency,
      fiscal_cpf: checkout.fiscal_cpf,
      promotion_code: checkout.promotion_code,
      subtotal_amount: checkout.subtotal_amount.toString(),
      discount_amount: checkout.discount_amount.toString(),
      total_amount: checkout.total_amount.toString(),
      expires_at: checkout.expires_at.toISOString(),
      sale_id: checkout.sale_id,
      public_reference: checkout.public_reference,
      tickets: checkout.checkout_session_tickets.map((ticket) => ({
        id: ticket.id,
        showtime_id: ticket.showtime_id,
        seat_id: ticket.seat_id,
        ticket_type: ticket.ticket_type,
        face_value: ticket.face_value.toString(),
        service_fee: ticket.service_fee.toString(),
        total_amount: ticket.total_amount.toString(),
      })),
      concession_items: checkout.checkout_session_concessions.map((item) => ({
        id: item.id,
        complex_id: item.complex_id,
        item_type: item.item_type,
        item_id: item.item_id,
        quantity: item.quantity,
        unit_price: item.unit_price.toString(),
        total_price: item.total_price.toString(),
      })),
      payment: this.latestAttempt(checkout)
        ? this.mapPaymentAttempt(this.latestAttempt(checkout)!, checkout)
        : null,
    };
  }

  private mapPaymentAttempt(
    attempt: PaymentAttempt,
    checkout: CheckoutWithRelations | null,
  ) {
    return {
      id: attempt.id,
      checkout_session_id: attempt.checkout_session_id,
      provider: attempt.provider,
      method: attempt.method,
      status: attempt.status,
      amount: attempt.amount.toString(),
      currency: attempt.currency,
      provider_reference: attempt.provider_reference,
      sale_id: attempt.sale_id ?? checkout?.sale_id ?? null,
      public_reference: checkout?.public_reference ?? null,
      payment_data: attempt.payment_data_json
        ? JSON.parse(attempt.payment_data_json)
        : null,
      error_code: attempt.error_code,
      error_message: attempt.error_message,
      paid_at: attempt.paid_at?.toISOString() ?? null,
      expires_at: attempt.expires_at?.toISOString() ?? null,
    };
  }

  private normalizeCpf(value?: string | null) {
    const normalized = value?.replace(/\D/g, '') || null;
    return normalized || null;
  }

  private normalize(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
