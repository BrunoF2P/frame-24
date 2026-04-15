import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { Prisma } from '@repo/db';
import { randomUUID } from 'crypto';
import { ClsService } from 'nestjs-cls';
import { SalesService } from 'src/modules/sales/services/sales.service';
import {
  SaleWithFullRelations,
  SalesRepository,
} from 'src/modules/sales/repositories/sales.repository';
import { CompanyCustomersRepository } from '../repositories/company-customers.repository';
import { CreatePurchaseDto } from '../dto/create-purchase.dto';
import { SaleResponseDto } from 'src/modules/sales/dto/sale-response.dto';
import { CreateSaleDto } from 'src/modules/sales/dto/create-sale.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoggerService } from 'src/common/services/logger.service';
import { EmailService } from 'src/modules/email/services/email.service';
import { CreateCustomerRefundRequestDto } from '../dto/customer-refund-request.dto';

type CustomerSaleWithRelations = Prisma.salesGetPayload<{
  include: {
    tickets: {
      include: {
        ticket_types: true;
      };
    };
    concession_sales: {
      include: {
        concession_sale_items: true;
      };
    };
    sale_types: true;
    payment_methods: true;
    sale_status: true;
  };
}>;

type ShowtimeWithRelations = Prisma.showtime_scheduleGetPayload<{
  include: {
    cinema_complexes: true;
    rooms: true;
    projection_types: true;
    audio_types: true;
    session_languages: true;
  };
}>;

type SeatWithType = Prisma.seatsGetPayload<{
  include: {
    seat_types: true;
  };
}>;

type MovieWithPoster = Prisma.moviesGetPayload<{
  include: {
    age_rating: true;
    movie_media: {
      include: {
        media_types: true;
      };
    };
  };
}>;

type TicketWithSaleSummary = Prisma.ticketsGetPayload<{
  include: {
    sales: {
      select: {
        id: true;
        sale_number: true;
        sale_date: true;
        cinema_complex_id: true;
        customer_id: true;
      };
    };
  };
}>;

type CustomerTicketResponse = {
  id: string;
  ticket_number: string;
  seat: string | null;
  face_value: string;
  service_fee: string;
  total_amount: string;
  used: boolean;
  usage_date?: string;
  sale: {
    id: string;
    sale_number: string;
    sale_date: string;
    cinema_complex_id: string;
  };
  created_at?: string;
};

type CustomerOrderItem = {
  id: string;
  item_type: 'ticket' | 'concession';
  reference_id: string;
  label: string;
  quantity: number;
  unit_amount: string;
  total_amount: string;
  metadata?: Record<string, unknown>;
  refund_eligibility: {
    eligible: boolean;
    reason: string | null;
  };
};

type CustomerOrderResponse = {
  id: string;
  sale_number: string;
  sale_date: string;
  status: string | null;
  payment_method: string | null;
  total_amount: string;
  discount_amount: string;
  net_amount: string;
  cinema_complex_id: string;
  order_items: CustomerOrderItem[];
  showtime: {
    id: string;
    start_time: string;
    cinema: string;
    room: string | null;
  } | null;
  movie: {
    id: string;
    title: string;
    poster_url: string | null;
    age_rating: string | null;
  } | null;
  can_request_refund: boolean;
};

@Injectable()
export class CustomerPurchasesService {
  constructor(
    private readonly salesService: SalesService,
    private readonly salesRepository: SalesRepository,
    private readonly companyCustomersRepository: CompanyCustomersRepository,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly logger: LoggerService,
    private readonly cls: ClsService,
  ) {}

  private getCustomerContext(): { companyId: string; customerId: string } {
    const companyId = this.cls.get<string>('companyId');
    const customerId = this.cls.get<string>('customerId');

    if (!companyId || !customerId) {
      throw new ForbiddenException('Contexto do cliente não encontrado.');
    }

    return { companyId, customerId };
  }

  @Transactional()
  async purchase(dto: CreatePurchaseDto): Promise<SaleResponseDto> {
    const context = this.getCustomerContext();
    let pointsDiscount = 0;
    if (dto.use_points && dto.use_points > 0) {
      const companyCustomer =
        await this.companyCustomersRepository.findByCompanyAndCustomer(
          context.companyId,
          context.customerId,
        );

      if (!companyCustomer) {
        throw new NotFoundException('Cliente não encontrado');
      }

      const availablePoints = companyCustomer.accumulated_points || 0;
      if (dto.use_points > availablePoints) {
        throw new BadRequestException(
          `Pontos insuficientes. Disponível: ${availablePoints}, Solicitado: ${dto.use_points}`,
        );
      }

      const deducted =
        await this.companyCustomersRepository.decrementAccumulatedPointsIfAtLeast(
          context.companyId,
          context.customerId,
          dto.use_points,
        );
      if (!deducted) {
        throw new BadRequestException(
          'Não foi possível reservar os pontos (concorrência ou saldo alterado). Tente novamente.',
        );
      }

      pointsDiscount = dto.use_points * 0.01;
    }

    const createSaleDto: CreateSaleDto = {
      cinema_complex_id: dto.cinema_complex_id,
      payment_method: dto.payment_method,
      tickets: dto.tickets,
      concession_items: dto.concession_items,
      discount_amount: (dto.discount_amount || 0) + pointsDiscount,
      promotion_code: dto.promotion_code,
    };

    const sale = await this.salesService.create(createSaleDto);

    await this.accumulateLoyaltyPoints(sale, context);

    // Confirmar reserva no WebSocket se houver
    if (dto.reservation_uuid) {
      // Isso será feito pelo frontend chamando o WebSocket
      // ou podemos criar um método aqui
    }

    return sale;
  }

  async findAll(): Promise<SaleResponseDto[]> {
    const context = this.getCustomerContext();
    const sales: CustomerSaleWithRelations[] = await this.prisma.sales.findMany(
      {
        where: {
          customer_id: context.customerId,
        },
        include: {
          tickets: {
            include: {
              ticket_types: true,
            },
          },
          concession_sales: {
            include: {
              concession_sale_items: true,
            },
          },
          sale_types: true,
          payment_methods: true,
          sale_status: true,
        },
        orderBy: {
          sale_date: 'desc',
        },
      },
    );

    const showtimeIds = [
      ...new Set(
        sales.flatMap((sale) =>
          sale.tickets
            .map((ticket) => ticket.showtime_id)
            .filter((id): id is string => Boolean(id)),
        ),
      ),
    ];
    const seatIds = [
      ...new Set(
        sales.flatMap((sale) =>
          sale.tickets
            .map((ticket) => ticket.seat_id)
            .filter((id): id is string => Boolean(id)),
        ),
      ),
    ];

    const [showtimes, seats] = await Promise.all([
      this.prisma.showtime_schedule.findMany({
        where: { id: { in: showtimeIds } },
        include: {
          cinema_complexes: true,
          rooms: true,
          projection_types: true,
          audio_types: true,
          session_languages: true,
        },
      }),
      this.prisma.seats.findMany({
        where: { id: { in: seatIds } },
        include: {
          seat_types: true,
        },
      }),
    ]);

    const showtimeMap = new Map<string, ShowtimeWithRelations>(
      showtimes.map((showtime) => [showtime.id, showtime]),
    );
    const seatMap = new Map<string, SeatWithType>(
      seats.map((seat) => [seat.id, seat]),
    );

    const movieIds = [
      ...new Set(
        showtimes
          .map((showtime) => showtime.movie_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const movies: MovieWithPoster[] = await this.prisma.movies.findMany({
      where: { id: { in: movieIds } },
      include: {
        age_rating: true,
        movie_media: {
          where: {
            active: true,
            media_types: {
              name: 'Poster',
            },
          },
          include: {
            media_types: true,
          },
          take: 1,
        },
      },
    });
    const movieMap = new Map<
      string,
      {
        id: string;
        title: string;
        poster_url: string | null;
        duration_minutes: number;
        age_rating: string | null;
      }
    >(
      movies.map((movie) => [
        movie.id,
        {
          id: movie.id,
          title: movie.brazil_title || movie.original_title || '',
          poster_url: movie.movie_media[0]?.media_url || null,
          duration_minutes: movie.duration_minutes ?? 0,
          age_rating: movie.age_rating?.code || null,
        },
      ]),
    );

    return sales.map((sale): SaleResponseDto => {
      const firstTicket = sale.tickets[0];
      const showtimeDetails = firstTicket?.showtime_id
        ? showtimeMap.get(firstTicket.showtime_id)
        : undefined;
      const movieDetails = showtimeDetails?.movie_id
        ? movieMap.get(showtimeDetails.movie_id)
        : undefined;

      const ticketsWithSeats = sale.tickets.map((ticket) => {
        const seat = ticket.seat_id ? seatMap.get(ticket.seat_id) : undefined;
        return {
          id: ticket.id,
          ticket_number: ticket.ticket_number,
          seat: seat
            ? {
                id: seat.id,
                seat_code: seat.seat_code,
                row_code: seat.row_code,
                column_number: seat.column_number,
                seat_type: seat.seat_types?.name || 'Padrão',
              }
            : undefined,
          face_value: ticket.face_value.toString(),
          service_fee: (ticket.service_fee || 0).toString(),
          total_amount: ticket.total_amount.toString(),
          used: ticket.used || false,
          usage_date: ticket.usage_date?.toISOString(),
          ticket_type: ticket.ticket_types?.name,
        };
      });

      return {
        id: sale.id,
        sale_number: sale.sale_number,
        cinema_complex_id: sale.cinema_complex_id,
        customer_id: sale.customer_id ?? undefined,
        sale_date: sale.sale_date.toISOString(),
        total_amount: sale.total_amount.toString(),
        discount_amount: (sale.discount_amount || 0).toString(),
        net_amount: sale.net_amount.toString(),
        sale_type: sale.sale_types?.name,
        payment_method: sale.payment_methods?.name,
        status: sale.sale_status?.name,
        tickets: ticketsWithSeats,
        showtime: showtimeDetails
          ? {
              id: showtimeDetails.id,
              start_time: showtimeDetails.start_time.toISOString(),
              cinema: showtimeDetails.cinema_complexes?.name || '',
              room: showtimeDetails.rooms?.name,
            }
          : undefined,
        movie: movieDetails,
        created_at: sale.created_at?.toISOString() || new Date().toISOString(),
      };
    });
  }

  async findOne(id: string): Promise<SaleResponseDto> {
    const context = this.getCustomerContext();
    const sale = await this.salesRepository.findById(id, context.companyId);

    if (!sale) {
      throw new NotFoundException('Compra não encontrada');
    }

    // Validar que a venda pertence ao cliente
    if (sale.customer_id !== context.customerId) {
      throw new ForbiddenException(
        'Você não tem permissão para ver esta compra',
      );
    }

    return this.mapToDto(sale);
  }

  async findTickets(): Promise<CustomerTicketResponse[]> {
    const context = this.getCustomerContext();
    // Buscar todas as vendas do cliente
    const sales = await this.salesRepository.findAll(context.companyId, {
      customer_id: context.customerId,
    });

    const saleIds = sales.map((s) => s.id);

    // Buscar todos os tickets dessas vendas
    const tickets = await this.prisma.tickets.findMany({
      where: {
        sale_id: { in: saleIds },
      },
      include: {
        sales: {
          select: {
            id: true,
            sale_number: true,
            sale_date: true,
            cinema_complex_id: true,
            customer_id: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return tickets
      .filter((ticket): ticket is TicketWithSaleSummary =>
        Boolean(ticket.sales),
      )
      .map((ticket) => this.mapTicketToResponse(ticket));
  }

  async findTicketById(id: string): Promise<CustomerTicketResponse> {
    const context = this.getCustomerContext();
    const ticket: TicketWithSaleSummary | null =
      await this.prisma.tickets.findFirst({
        where: { id },
        include: {
          sales: {
            select: {
              id: true,
              sale_number: true,
              sale_date: true,
              cinema_complex_id: true,
              customer_id: true,
            },
          },
        },
      });

    if (!ticket || !ticket.sales) {
      throw new NotFoundException('Ingresso não encontrado');
    }

    if (ticket.sales.customer_id !== context.customerId) {
      throw new ForbiddenException(
        'Você não tem permissão para ver este ingresso',
      );
    }

    return this.mapTicketToResponse(ticket);
  }

  async getTicketQrCode(
    id: string,
  ): Promise<{ payload: string; base64: string }> {
    const context = this.getCustomerContext();
    const ticket: TicketWithSaleSummary | null =
      await this.prisma.tickets.findFirst({
        where: { id },
        include: {
          sales: {
            select: {
              id: true,
              sale_number: true,
              sale_date: true,
              cinema_complex_id: true,
              customer_id: true,
            },
          },
        },
      });

    if (!ticket || !ticket.sales) {
      throw new NotFoundException('Ingresso não encontrado');
    }

    if (ticket.sales.customer_id !== context.customerId) {
      throw new ForbiddenException(
        'Você não tem permissão para ver este ingresso',
      );
    }

    const payload = JSON.stringify({
      ticket_id: ticket.id,
      ticket_number: ticket.ticket_number,
      sale_id: ticket.sales.id,
      sale_number: ticket.sales.sale_number,
      cinema_complex_id: ticket.sales.cinema_complex_id,
      showtime_id: ticket.showtime_id,
    });

    const base64 = Buffer.from(payload).toString('base64');

    return { payload, base64 };
  }

  async cancelPurchase(
    id: string,
    reason = 'Cancelado pelo cliente',
  ): Promise<void> {
    const context = this.getCustomerContext();
    const sale = await this.salesRepository.findById(id, context.companyId);

    if (!sale) {
      throw new NotFoundException('Compra não encontrada');
    }

    if (sale.customer_id !== context.customerId) {
      throw new ForbiddenException(
        'Você não tem permissão para cancelar esta compra',
      );
    }

    await this.salesService.cancel(id, reason);
  }

  async getHistory(): Promise<{
    purchases: SaleResponseDto[];
    tickets: CustomerTicketResponse[];
  }> {
    const purchases = await this.findAll();
    const tickets = await this.findTickets();

    return { purchases, tickets };
  }

  async findOrders(): Promise<CustomerOrderResponse[]> {
    const context = this.getCustomerContext();
    const sales = await this.prisma.sales.findMany({
      where: {
        customer_id: context.customerId,
      },
      include: {
        tickets: {
          include: {
            ticket_types: true,
          },
        },
        concession_sales: {
          include: {
            concession_sale_items: true,
          },
        },
        sale_types: true,
        payment_methods: true,
        sale_status: true,
      },
      orderBy: {
        sale_date: 'desc',
      },
    });

    return this.mapSalesToOrders(sales);
  }

  async findOrderById(id: string): Promise<CustomerOrderResponse> {
    const context = this.getCustomerContext();
    const sale = await this.prisma.sales.findFirst({
      where: {
        id,
        customer_id: context.customerId,
      },
      include: {
        tickets: {
          include: {
            ticket_types: true,
          },
        },
        concession_sales: {
          include: {
            concession_sale_items: true,
          },
        },
        sale_types: true,
        payment_methods: true,
        sale_status: true,
      },
    });

    if (!sale) {
      throw new NotFoundException('Pedido não encontrado.');
    }

    const [mapped] = await this.mapSalesToOrders([sale]);
    if (!mapped) {
      throw new NotFoundException('Pedido não encontrado.');
    }

    return mapped;
  }

  async createRefundRequest(
    orderId: string,
    dto: CreateCustomerRefundRequestDto,
  ) {
    const context = this.getCustomerContext();
    const sale = await this.prisma.sales.findFirst({
      where: {
        id: orderId,
        customer_id: context.customerId,
      },
      include: {
        tickets: true,
        concession_sales: {
          include: {
            concession_sale_items: true,
          },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException('Pedido não encontrado.');
    }

    const showtimeId = sale.tickets[0]?.showtime_id;
    const showtime = showtimeId
      ? await this.prisma.showtime_schedule.findFirst({
          where: { id: showtimeId },
        })
      : null;

    const validationErrors: string[] = [];
    const normalizedItems = dto.items.map((item) => {
      if (item.item_type === 'ticket') {
        const ticket = sale.tickets.find((ticketItem) => ticketItem.id === item.item_id);
        if (!ticket) {
          validationErrors.push(`Ingresso ${item.item_id} não pertence ao pedido.`);
          return null;
        }

        const eligibility = this.resolveTicketRefundEligibility(
          ticket.used ?? false,
          showtime?.start_time ?? null,
        );

        if (!eligibility.eligible) {
          validationErrors.push(
            `Ingresso ${ticket.ticket_number}: ${eligibility.reason ?? 'não elegível'}.`,
          );
        }

        return {
          item_type: 'ticket' as const,
          item_id: ticket.id,
          quantity: 1,
          requested_quantity: 1,
          eligibility,
        };
      }

      const concessionItems = sale.concession_sales.flatMap(
        (concessionSale) => concessionSale.concession_sale_items,
      );
      const concession = concessionItems.find(
        (concessionItem) => concessionItem.id === item.item_id,
      );

      if (!concession) {
        validationErrors.push(`Item de bomboniere ${item.item_id} não pertence ao pedido.`);
        return null;
      }

      const requestedQuantity = item.quantity ?? 1;
      if (requestedQuantity > concession.quantity) {
        validationErrors.push(
          `Quantidade solicitada para ${item.item_id} excede a quantidade do pedido.`,
        );
      }

      const eligibility = this.resolveConcessionRefundEligibility(
        showtime?.start_time ?? null,
      );
      if (!eligibility.eligible) {
        validationErrors.push(
          `Item de bomboniere ${item.item_id}: ${eligibility.reason ?? 'não elegível'}.`,
        );
      }

      return {
        item_type: 'concession' as const,
        item_id: concession.id,
        quantity: concession.quantity,
        requested_quantity: requestedQuantity,
        eligibility,
      };
    });

    if (validationErrors.length > 0) {
      throw new BadRequestException(validationErrors.join(' '));
    }

    const requestId = randomUUID();
    const payload = {
      status: 'requested',
      order_id: orderId,
      reason: dto.reason ?? null,
      items: normalizedItems.filter(Boolean),
      requested_at: new Date().toISOString(),
    };

    await this.prisma.audit_logs.create({
      data: {
        company_id: context.companyId,
        event_type: 'customer.refund.requested',
        resource_type: 'CUSTOMER_REFUND_REQUEST',
        resource_id: requestId,
        action: 'REFUND_REQUESTED',
        user_id: context.customerId,
        old_values: {
          order_id: orderId,
        },
        new_values: payload,
      },
    });

    return {
      request_id: requestId,
      ...payload,
    };
  }

  async listRefundRequests() {
    const context = this.getCustomerContext();
    const requests = await this.prisma.audit_logs.findMany({
      where: {
        resource_type: 'CUSTOMER_REFUND_REQUEST',
        action: 'REFUND_REQUESTED',
        user_id: context.customerId,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return requests.map((item) => ({
      request_id: item.resource_id,
      ...(item.new_values as Record<string, unknown>),
      created_at: item.created_at.toISOString(),
    }));
  }

  async getRefundRequestById(requestId: string) {
    const context = this.getCustomerContext();
    const request = await this.prisma.audit_logs.findFirst({
      where: {
        resource_type: 'CUSTOMER_REFUND_REQUEST',
        action: 'REFUND_REQUESTED',
        user_id: context.customerId,
        resource_id: requestId,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!request) {
      throw new NotFoundException('Solicitação de reembolso não encontrada.');
    }

    return {
      request_id: request.resource_id,
      ...(request.new_values as Record<string, unknown>),
      created_at: request.created_at.toISOString(),
    };
  }

  async getTicketPdf(ticketId: string): Promise<Buffer> {
    const context = this.getCustomerContext();
    const ticket = await this.prisma.tickets.findFirst({
      where: {
        id: ticketId,
      },
      include: {
        sales: {
          select: {
            id: true,
            sale_number: true,
            sale_date: true,
            cinema_complex_id: true,
            customer_id: true,
          },
        },
      },
    });

    if (!ticket || !ticket.sales) {
      throw new NotFoundException('Ingresso não encontrado.');
    }

    if (ticket.sales.customer_id !== context.customerId) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar este ingresso.',
      );
    }

    const showtime = ticket.showtime_id
      ? await this.prisma.showtime_schedule.findFirst({
          where: {
            id: ticket.showtime_id,
          },
          include: {
            cinema_complexes: true,
          },
        })
      : null;

    const movie = showtime?.movie_id
      ? await this.prisma.movies.findFirst({
          where: {
            id: showtime.movie_id,
          },
        })
      : null;

    const pdfTitle = movie?.brazil_title || movie?.original_title || 'Ingresso';
    const showtimeLabel = showtime?.start_time
      ? new Date(showtime.start_time).toLocaleString('pt-BR')
      : 'Horário indisponível';
    const cinemaLabel = showtime?.cinema_complexes?.name ?? 'Cinema';

    return this.generateSimpleTicketPdf({
      title: pdfTitle,
      cinemaLabel,
      showtimeLabel,
      seat: ticket.seat || 'Sem assento',
      ticketNumber: ticket.ticket_number,
      orderNumber: ticket.sales.sale_number,
    });
  }

  async resendTicketByEmail(ticketId: string) {
    const context = this.getCustomerContext();
    const ticket = await this.prisma.tickets.findFirst({
      where: {
        id: ticketId,
      },
      include: {
        sales: {
          select: {
            id: true,
            sale_number: true,
            cinema_complex_id: true,
            customer_id: true,
          },
        },
      },
    });

    if (!ticket || !ticket.sales) {
      throw new NotFoundException('Ingresso não encontrado.');
    }

    if (ticket.sales.customer_id !== context.customerId) {
      throw new ForbiddenException(
        'Você não tem permissão para reenviar este ingresso.',
      );
    }

    const customer = await this.prisma.customers.findFirst({
      where: {
        id: context.customerId,
      },
    });

    if (!customer?.email) {
      throw new BadRequestException('Cliente sem e-mail cadastrado.');
    }

    const showtime = ticket.showtime_id
      ? await this.prisma.showtime_schedule.findFirst({
          where: {
            id: ticket.showtime_id,
          },
          include: {
            cinema_complexes: true,
          },
        })
      : null;

    const movie = showtime?.movie_id
      ? await this.prisma.movies.findFirst({
          where: { id: showtime.movie_id },
        })
      : null;

    const movieTitle = movie?.brazil_title || movie?.original_title || 'Ingresso';
    const showtimeLabel = showtime?.start_time
      ? new Date(showtime.start_time).toLocaleString('pt-BR')
      : 'Horário indisponível';
    const cinemaName = showtime?.cinema_complexes?.name || 'Cinema';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    await this.emailService.sendCustomerTicketEmail({
      to: customer.email,
      customerName: customer.full_name,
      movieTitle,
      cinemaName,
      showtimeLabel,
      ticketNumber: ticket.ticket_number,
      ticketUrl: `${frontendUrl}/perfil/ingressos/${ticket.id}`,
    });

    return { success: true };
  }

  private async accumulateLoyaltyPoints(
    sale: SaleResponseDto,
    context: { companyId: string; customerId: string },
  ): Promise<void> {
    const netAmount = parseFloat(sale.net_amount);

    // Calcular pontos (exemplo: R$ 1,00 = 1 ponto)
    const pointsToAdd = Math.floor(netAmount);

    if (pointsToAdd <= 0) {
      return;
    }

    const companyCustomer =
      await this.companyCustomersRepository.findByCompanyAndCustomer(
        context.companyId,
        context.customerId,
      );

    if (!companyCustomer) {
      return;
    }

    const currentPoints = companyCustomer.accumulated_points || 0;
    const newPoints = currentPoints + pointsToAdd;

    // Atualizar pontos
    await this.companyCustomersRepository.update(
      context.companyId,
      context.customerId,
      {
        accumulated_points: newPoints,
      },
    );

    // Verificar e atualizar nível de fidelidade
    await this.updateLoyaltyLevel(context, newPoints);

    this.logger.log(
      `Pontos acumulados: ${pointsToAdd} para cliente ${context.customerId}. Total: ${newPoints}`,
      CustomerPurchasesService.name,
    );
  }

  private async updateLoyaltyLevel(
    context: { companyId: string; customerId: string },
    totalPoints: number,
  ): Promise<void> {
    // Definir níveis de fidelidade
    let newLevel = 'BRONZE';
    if (totalPoints >= 5000) {
      newLevel = 'GOLD';
    } else if (totalPoints >= 2000) {
      newLevel = 'SILVER';
    }

    const companyCustomer =
      await this.companyCustomersRepository.findByCompanyAndCustomer(
        context.companyId,
        context.customerId,
      );

    if (companyCustomer && companyCustomer.loyalty_level !== newLevel) {
      await this.companyCustomersRepository.update(
        context.companyId,
        context.customerId,
        {
          loyalty_level: newLevel,
        },
      );

      this.logger.log(
        `Nível de fidelidade atualizado: ${companyCustomer.loyalty_level} → ${newLevel} para cliente ${context.customerId}`,
        CustomerPurchasesService.name,
      );
    }
  }

  private async mapSalesToOrders(
    sales: CustomerSaleWithRelations[],
  ): Promise<CustomerOrderResponse[]> {
    const showtimeIds = [
      ...new Set(
        sales.flatMap((sale) =>
          sale.tickets
            .map((ticket) => ticket.showtime_id)
            .filter((id): id is string => Boolean(id)),
        ),
      ),
    ];

    const showtimes = await this.prisma.showtime_schedule.findMany({
      where: {
        id: {
          in: showtimeIds,
        },
      },
      include: {
        cinema_complexes: true,
        rooms: true,
      },
    });
    const showtimeMap = new Map(showtimes.map((showtime) => [showtime.id, showtime]));

    const movieIds = [
      ...new Set(
        showtimes
          .map((showtime) => showtime.movie_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const movies = await this.prisma.movies.findMany({
      where: {
        id: {
          in: movieIds,
        },
      },
      include: {
        age_rating: true,
        movie_media: {
          where: {
            active: true,
            media_types: {
              name: 'Poster',
            },
          },
          include: {
            media_types: true,
          },
          take: 1,
        },
      },
    });
    const movieMap = new Map(
      movies.map((movie) => [
        movie.id,
        {
          id: movie.id,
          title: movie.brazil_title || movie.original_title || '',
          poster_url: movie.movie_media[0]?.media_url || null,
          age_rating: movie.age_rating?.code || null,
        },
      ]),
    );

    const concessionItems = sales.flatMap((sale) =>
      sale.concession_sales.flatMap((concessionSale) =>
        concessionSale.concession_sale_items.map((item) => ({
          item_id: item.item_id,
          item_type: item.item_type,
        })),
      ),
    );

    const productIds = concessionItems
      .filter((item) => item.item_type === 'PRODUCT')
      .map((item) => item.item_id);
    const comboIds = concessionItems
      .filter((item) => item.item_type === 'COMBO')
      .map((item) => item.item_id);

    const [products, combos] = await Promise.all([
      productIds.length
        ? this.prisma.products.findMany({
            where: {
              id: {
                in: productIds,
              },
            },
          })
        : Promise.resolve([]),
      comboIds.length
        ? this.prisma.combos.findMany({
            where: {
              id: {
                in: comboIds,
              },
            },
          })
        : Promise.resolve([]),
    ]);

    const productMap = new Map(products.map((item) => [item.id, item.name]));
    const comboMap = new Map(combos.map((item) => [item.id, item.name]));

    return sales.map((sale) => {
      const firstTicket = sale.tickets[0];
      const showtime = firstTicket?.showtime_id
        ? showtimeMap.get(firstTicket.showtime_id)
        : null;
      const movie = showtime?.movie_id ? movieMap.get(showtime.movie_id) : null;

      const ticketItems: CustomerOrderItem[] = sale.tickets.map((ticket) => {
        const eligibility = this.resolveTicketRefundEligibility(
          ticket.used ?? false,
          showtime?.start_time ?? null,
        );

        return {
          id: `ticket-item-${ticket.id}`,
          item_type: 'ticket',
          reference_id: ticket.id,
          label: ticket.ticket_types?.name || 'Ingresso',
          quantity: 1,
          unit_amount: ticket.total_amount.toString(),
          total_amount: ticket.total_amount.toString(),
          metadata: {
            seat: ticket.seat,
            ticket_number: ticket.ticket_number,
            used: ticket.used || false,
          },
          refund_eligibility: eligibility,
        };
      });

      const concessionLineItems = sale.concession_sales.flatMap((concessionSale) =>
        concessionSale.concession_sale_items.map((item) => {
          const eligibility = this.resolveConcessionRefundEligibility(
            showtime?.start_time ?? null,
          );
          const itemLabel =
            item.item_type === 'PRODUCT'
              ? productMap.get(item.item_id) || 'Produto'
              : comboMap.get(item.item_id) || 'Combo';

          return {
            id: `concession-item-${item.id}`,
            item_type: 'concession' as const,
            reference_id: item.id,
            label: itemLabel,
            quantity: item.quantity,
            unit_amount: item.unit_price.toString(),
            total_amount: item.total_price.toString(),
            metadata: {
              concession_item_type: item.item_type,
              source_item_id: item.item_id,
            },
            refund_eligibility: eligibility,
          };
        }),
      );

      const items = [...ticketItems, ...concessionLineItems];
      const canRequestRefund = items.some((item) => item.refund_eligibility.eligible);

      return {
        id: sale.id,
        sale_number: sale.sale_number,
        sale_date: sale.sale_date.toISOString(),
        status: sale.sale_status?.name || null,
        payment_method: sale.payment_methods?.name || null,
        total_amount: sale.total_amount.toString(),
        discount_amount: (sale.discount_amount || 0).toString(),
        net_amount: sale.net_amount.toString(),
        cinema_complex_id: sale.cinema_complex_id,
        order_items: items,
        showtime: showtime
          ? {
              id: showtime.id,
              start_time: showtime.start_time.toISOString(),
              cinema: showtime.cinema_complexes?.name || '',
              room: showtime.rooms?.name || null,
            }
          : null,
        movie: movie || null,
        can_request_refund: canRequestRefund,
      };
    });
  }

  private resolveTicketRefundEligibility(
    used: boolean,
    startTime: Date | null,
  ): { eligible: boolean; reason: string | null } {
    if (used) {
      return { eligible: false, reason: 'Ingresso já utilizado.' };
    }

    if (!startTime) {
      return {
        eligible: false,
        reason: 'Sessão sem horário válido para análise de reembolso.',
      };
    }

    const deadline = new Date(startTime.getTime() - 2 * 60 * 60 * 1000);
    if (Date.now() > deadline.getTime()) {
      return {
        eligible: false,
        reason: 'Prazo de solicitação encerrado (até 2h antes da sessão).',
      };
    }

    return { eligible: true, reason: null };
  }

  private resolveConcessionRefundEligibility(
    startTime: Date | null,
  ): { eligible: boolean; reason: string | null } {
    if (!startTime) {
      return {
        eligible: false,
        reason: 'Sem sessão vinculada para validar bomboniere.',
      };
    }

    const deadline = new Date(startTime.getTime() - 2 * 60 * 60 * 1000);
    if (Date.now() > deadline.getTime()) {
      return {
        eligible: false,
        reason: 'Prazo de solicitação encerrado (até 2h antes da sessão).',
      };
    }

    return { eligible: true, reason: null };
  }

  private generateSimpleTicketPdf(params: {
    title: string;
    cinemaLabel: string;
    showtimeLabel: string;
    seat: string;
    ticketNumber: string;
    orderNumber: string;
  }): Buffer {
    const lines = [
      'Frame-24 - Ingresso Digital',
      `Filme: ${params.title}`,
      `Cinema: ${params.cinemaLabel}`,
      `Sessao: ${params.showtimeLabel}`,
      `Assento: ${params.seat}`,
      `Ingresso: ${params.ticketNumber}`,
      `Pedido: ${params.orderNumber}`,
    ];
    const escapedLines = lines.map((line) =>
      line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'),
    );
    const textStream = [
      'BT',
      '/F1 14 Tf',
      '50 780 Td',
      ...escapedLines.flatMap((line, index) =>
        index === 0 ? [`(${line}) Tj`] : ['0 -24 Td', `(${line}) Tj`],
      ),
      'ET',
    ].join('\n');

    const contentLength = Buffer.byteLength(textStream, 'utf8');
    const objects = [
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
      '2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n',
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
      '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
      `5 0 obj\n<< /Length ${contentLength} >>\nstream\n${textStream}\nendstream\nendobj\n`,
    ];

    let pdf = '%PDF-1.4\n';
    const offsets = [0];

    for (const object of objects) {
      offsets.push(Buffer.byteLength(pdf, 'utf8'));
      pdf += object;
    }

    const xrefPosition = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (let index = 1; index <= objects.length; index += 1) {
      const offset = String(offsets[index] || 0).padStart(10, '0');
      pdf += `${offset} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPosition}\n%%EOF`;

    return Buffer.from(pdf, 'utf8');
  }

  private mapToDto(sale: SaleWithFullRelations): SaleResponseDto {
    return {
      id: sale.id,
      sale_number: sale.sale_number,
      cinema_complex_id: sale.cinema_complex_id,
      customer_id: sale.customer_id ?? undefined,
      sale_date: sale.sale_date.toISOString(),
      total_amount: sale.total_amount.toString(),
      discount_amount: (sale.discount_amount || 0).toString(),
      net_amount: sale.net_amount.toString(),
      sale_type: sale.sale_types?.name,
      payment_method: sale.payment_methods?.name,
      status: sale.sale_status?.name,
      tickets: (sale.tickets || []).map((ticket) => ({
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        seat: ticket.seat ?? undefined,
        face_value: ticket.face_value.toString(),
        service_fee: (ticket.service_fee || 0).toString(),
        total_amount: ticket.total_amount.toString(),
        used: ticket.used || false,
        usage_date: ticket.usage_date?.toISOString(),
      })),
      created_at: sale.created_at?.toISOString() || new Date().toISOString(),
    };
  }

  private mapTicketToResponse(
    ticket: TicketWithSaleSummary,
  ): CustomerTicketResponse {
    return {
      id: ticket.id,
      ticket_number: ticket.ticket_number,
      seat: ticket.seat,
      face_value: ticket.face_value.toString(),
      service_fee: (ticket.service_fee || 0).toString(),
      total_amount: ticket.total_amount.toString(),
      used: ticket.used || false,
      usage_date: ticket.usage_date?.toISOString(),
      sale: {
        id: ticket.sales.id,
        sale_number: ticket.sales.sale_number,
        sale_date: ticket.sales.sale_date.toISOString(),
        cinema_complex_id: ticket.sales.cinema_complex_id,
      },
      created_at: ticket.created_at?.toISOString(),
    };
  }
}
