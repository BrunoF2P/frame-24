import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, products } from '@repo/db';
import { PrismaService } from 'src/prisma/prisma.service';
import { CinemaComplexesRepository } from 'src/modules/operations/cinema-complexes/repositories/cinema-complexes.repository';
import { ShowtimesRepository } from 'src/modules/operations/showtime_schedule/repositories/showtime.repository';
import { MovieRepository } from 'src/modules/catalog/movies/repositories/movie.repository';
import { ProductRepository } from 'src/modules/catalog/products/repositories/product.repository';
import { SeatsRepository } from 'src/modules/operations/seats/repositories/seats.repository';
import { SessionSeatStatusRepository } from 'src/modules/operations/session_seat_status/repositories/session-seat-status.repository';

interface SeatMapStatusData {
  status: string;
  sale_id: string | null;
  reservation_uuid: string | null;
  expiration_date: Date | null;
}

interface ShowtimesFilterOptions {
  complexId?: string;
  movieId?: string;
  date?: Date;
  page?: number;
  limit?: number;
}

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cinemaComplexesRepository: CinemaComplexesRepository,
    private readonly showtimesRepository: ShowtimesRepository,
    private readonly moviesRepository: MovieRepository,
    private readonly productsRepository: ProductRepository,
    private readonly seatsRepository: SeatsRepository,
    private readonly sessionSeatStatusRepository: SessionSeatStatusRepository,
  ) {}

  async getCompanies() {
    return this.prisma.companies.findMany({
      where: {
        active: true,
        suspended: false,
      },
      select: {
        id: true,
        corporate_name: true,
        trade_name: true,
        tenant_slug: true,
        logo_url: true,
        city: true,
        state: true,
      },
      orderBy: {
        corporate_name: 'asc',
      },
    });
  }

  async getCompanyBySlug(tenantSlug: string): Promise<{
    id: string;
    corporate_name: string;
    trade_name: string | null;
    tenant_slug: string;
    logo_url: string | null;
    city: string | null;
    state: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
  }> {
    const company = await this.prisma.companies.findUnique({
      where: { tenant_slug: tenantSlug },
    });

    if (!company || !company.active || company.suspended) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return {
      id: company.id,
      corporate_name: company.corporate_name,
      trade_name: company.trade_name,
      tenant_slug: company.tenant_slug,
      logo_url: company.logo_url,
      city: company.city,
      state: company.state,
      phone: company.phone,
      email: company.email,
      website: company.website,
    };
  }

  async getComplexesByCompany(companyId: string) {
    const complexes =
      await this.cinemaComplexesRepository.findAllByCompany(companyId);
    return complexes.filter((c) => c.active === true);
  }

  async getMovie(id: string) {
    return this.moviesRepository.findById(id);
  }

  async getMoviesByCompany(companyId: string) {
    // 1. Buscar complexos da empresa
    const complexes =
      await this.cinemaComplexesRepository.findAllByCompany(companyId);
    const complexIds = complexes.map((c) => c.id);

    // 2. Buscar sessões ativas (futuras, com assentos, status aberta)
    const activeShowtimes = await this.showtimesRepository.findAll({
      cinema_complex_id: { in: complexIds },
      start_time: { gt: new Date() },
      available_seats: { gt: 0 },
      session_status: {
        name: 'Aberta para Vendas',
      },
    });

    // 3. Extrair IDs únicos de filmes
    const movieIds = [...new Set(activeShowtimes.map((s) => s.movie_id))];

    if (movieIds.length === 0) {
      return [];
    }

    // 4. Buscar filmes
    return this.moviesRepository.findByIds(movieIds);
  }

  async getShowtimesByCompany(
    companyId: string,
    filters?: ShowtimesFilterOptions,
  ) {
    const showtimesPage = await this.getShowtimesByCompanyPaginated(
      companyId,
      filters,
    );

    return showtimesPage.items;
  }

  async getShowtimesByCompanyPaginated(
    companyId: string,
    filters?: ShowtimesFilterOptions,
  ) {
    // Buscar complexos da empresa
    const complexes =
      await this.cinemaComplexesRepository.findAllByCompany(companyId);
    const complexIds = complexes.map((c) => c.id);

    // Filtrar por complexo se fornecido
    const targetComplexIds = filters?.complexId
      ? [filters.complexId]
      : complexIds;

    // Buscar sessões
    const where: Prisma.showtime_scheduleWhereInput = {
      cinema_complex_id: { in: targetComplexIds },
      // Apenas sessões abertas para vendas
      session_status: {
        name: 'Aberta para Vendas',
      },
      start_time: {
        gte: new Date(),
      },
      ...(filters?.movieId && { movie_id: filters.movieId }),
    };

    if (filters?.date) {
      const startOfDay = new Date(filters.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(filters.date);
      endOfDay.setHours(23, 59, 59, 999);

      where.start_time = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const skip = (page - 1) * limit;

    const [showtimes, total] = await Promise.all([
      this.prisma.showtime_schedule.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          movie_id: true,
          start_time: true,
          end_time: true,
          base_ticket_price: true,
          available_seats: true,
          sold_seats: true,
          blocked_seats: true,
          cinema_complexes: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
          rooms: {
            select: {
              id: true,
              name: true,
              room_number: true,
            },
          },
          projection_types: {
            select: {
              id: true,
              name: true,
            },
          },
          audio_types: {
            select: {
              id: true,
              name: true,
            },
          },
          session_languages: {
            select: {
              id: true,
              name: true,
            },
          },
          session_status: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          start_time: 'asc',
        },
      }),
      this.prisma.showtime_schedule.count({ where }),
    ]);

    // Buscar filmes para cada sessão com includes
    const movieIds = [...new Set(showtimes.map((s) => s.movie_id))];
    const movies = await this.prisma.movies.findMany({
      where: { id: { in: movieIds } },
      include: {
        age_rating: {
          select: {
            code: true,
            name: true,
          },
        },
        movie_media: {
          where: {
            media_type: 'POSTER',
            active: true,
          },
          take: 1,
          select: {
            media_url: true,
          },
        },
      },
    });
    const movieMap = new Map(movies.map((m) => [m.id, m]));

    // Adicionar dados do filme a cada sessão
    const items = showtimes.map((showtime) => {
      const movie = movieMap.get(showtime.movie_id);
      return {
        ...showtime,
        movie: movie
          ? {
              id: movie.id,
              title: movie.brazil_title || movie.original_title,
              poster_url: movie.movie_media[0]?.media_url || null,
              duration_minutes: movie.duration_minutes,
              age_rating: movie.age_rating?.code || null,
            }
          : null,
      };
    });

    return {
      items,
      page,
      limit,
      total,
      total_pages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getShowtimeSeatsMap(showtimeId: string) {
    const showtime = await this.showtimesRepository.findById(showtimeId);
    if (!showtime || !('room_id' in showtime) || !showtime.room_id) {
      throw new NotFoundException('Sessão não encontrada');
    }

    // Buscar todos os assentos da sala
    const seats = await this.seatsRepository.findByRoomId(showtime.room_id);

    // Buscar status dos assentos para esta sessão
    const seatStatuses =
      await this.sessionSeatStatusRepository.findByShowtimeId(showtimeId);

    // Mapear status dos assentos
    const seatMap = new Map<string, SeatMapStatusData>();
    seatStatuses.forEach((ss) => {
      const statusName = ss.seat_status?.name || 'available';
      seatMap.set(ss.seat_id, {
        status: statusName,
        sale_id: ss.sale_id,
        reservation_uuid: ss.reservation_uuid,
        expiration_date: ss.expiration_date,
      });
    });

    // Montar mapa de assentos
    const seatsMap = seats.map((seat) => {
      const statusData = seatMap.get(seat.id);
      return {
        id: seat.id,
        seat_code: seat.seat_code,
        row_code: seat.row_code,
        column_number: seat.column_number,
        accessible: seat.accessible,
        status: statusData?.status || 'available',
        reserved: !!statusData?.reservation_uuid,
        reserved_until: statusData?.expiration_date || null,
        seat_type_name: seat.seat_types?.name || 'Padrão',
        additional_value: seat.seat_types?.additional_value || 0,
      };
    });

    // Buscar detalhes da sessão (cinema e sala)
    const showtimeDetails = await this.prisma.showtime_schedule.findUnique({
      where: { id: showtimeId },
      include: {
        cinema_complexes: true,
        rooms: true,
      },
    });

    // Buscar detalhes do filme separadamente (já que não tem relação direta no schema)
    let movieDetails = null;
    if (showtimeDetails?.movie_id) {
      movieDetails = await this.prisma.movies.findUnique({
        where: { id: showtimeDetails.movie_id },
        include: {
          movie_media: {
            where: { media_type: 'POSTER', active: true },
            take: 1,
          },
        },
      });
    }

    return {
      showtime_id: showtimeId,
      room_id: showtime.room_id,
      available_seats: showtime.available_seats || 0,
      sold_seats: showtime.sold_seats || 0,
      base_ticket_price: showtime.base_ticket_price,
      seats: seatsMap,
      movie: movieDetails
        ? {
            title: movieDetails.brazil_title || movieDetails.original_title,
            poster_url: movieDetails.movie_media[0]?.media_url,
          }
        : null,
      cinema: showtimeDetails?.cinema_complexes
        ? {
            id: showtimeDetails.cinema_complexes.id,
            name: showtimeDetails.cinema_complexes.name,
          }
        : null,
      room: showtimeDetails?.rooms
        ? {
            name: showtimeDetails.rooms.name,
          }
        : null,
      start_time: showtimeDetails?.start_time,
    };
  }

  async getProductsByCompany(companyId: string, complexId?: string) {
    const products = await this.productsRepository.findAll(companyId, true);

    // Se complex_id fornecido, buscar preços específicos
    if (complexId) {
      const productsWithPrices = await Promise.all(
        products.map(async (product) => {
          const price = await this.prisma.product_prices.findFirst({
            where: {
              product_id: product.id,
              complex_id: complexId,
              active: true,
              valid_from: { lte: new Date() },
              OR: [{ valid_to: { gte: new Date() } }, { valid_to: null }],
            },
            orderBy: { created_at: 'desc' },
          });

          return {
            ...product,
            price: price ? Number(price.sale_price) : null,
          };
        }),
      );

      return productsWithPrices.filter((p) => p.price !== null);
    }

    return products;
  }

  async getTicketTypes(companyId: string) {
    const types = await this.prisma.ticket_types.findMany({
      where: {
        company_id: companyId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        discount_percentage: true,
      },
      orderBy: {
        discount_percentage: 'desc',
      },
    });

    return types.map((t) => ({
      ...t,
      price_modifier: t.discount_percentage
        ? 1 - Number(t.discount_percentage) / 100
        : 1,
    }));
  }

  async getPaymentMethods(companyId: string) {
    return this.prisma.payment_methods.findMany({
      where: {
        company_id: companyId,
      },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });
  }

  async getStorefrontData(
    tenantSlug: string,
    options?: {
      includeShowtimes?: boolean;
      complexId?: string;
      movieId?: string;
      date?: Date;
      showtimesPage?: number;
      showtimesLimit?: number;
    },
  ) {
    const company = await this.getCompanyBySlug(tenantSlug);

    const [
      complexes,
      movies,
      products,
      ticketTypes,
      paymentMethods,
      showtimes,
    ] = await Promise.all([
      this.getComplexesByCompany(company.id),
      this.getMoviesByCompany(company.id),
      this.getProductsByCompany(company.id, options?.complexId),
      this.getTicketTypes(company.id),
      this.getPaymentMethods(company.id),
      options?.includeShowtimes
        ? this.getShowtimesByCompanyPaginated(company.id, {
            complexId: options?.complexId,
            movieId: options?.movieId,
            date: options?.date,
            page: options?.showtimesPage,
            limit: options?.showtimesLimit,
          })
        : Promise.resolve(null),
    ]);

    return {
      company,
      complexes,
      movies,
      products,
      ticket_types: ticketTypes,
      payment_methods: paymentMethods,
      showtimes,
    };
  }

  async getSaleDetails(companyId: string, publicReference: string) {
    const complexes =
      await this.cinemaComplexesRepository.findAllByCompany(companyId);
    const complexIds = complexes.map((c) => c.id);

    const sale = await this.prisma.sales.findFirst({
      where: {
        public_reference: publicReference,
        cinema_complex_id: { in: complexIds },
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
      },
    });

    if (!sale) {
      throw new NotFoundException('Venda não encontrada');
    }

    // Buscar detalhes da sessão
    let showtimeDetails = null;
    let movieDetails = null;

    if (sale.tickets.length > 0) {
      const showtimeId = sale.tickets[0].showtime_id;
      showtimeDetails = await this.prisma.showtime_schedule.findUnique({
        where: { id: showtimeId },
        include: {
          rooms: true,
          cinema_complexes: true,
        },
      });

      if (showtimeDetails && showtimeDetails.movie_id) {
        movieDetails = await this.prisma.movies.findUnique({
          where: { id: showtimeDetails.movie_id },
        });
      }
    }

    // Buscar detalhes dos produtos
    const productIds: string[] = [];
    sale.concession_sales.forEach((cs) => {
      cs.concession_sale_items.forEach((item) => {
        if (item.item_type === 'PRODUCT') {
          productIds.push(item.item_id);
        }
      });
    });

    let productsDetails: products[] = [];
    if (productIds.length > 0) {
      productsDetails = await this.prisma.products.findMany({
        where: { id: { in: productIds } },
      });
    }

    return {
      ...sale,
      showtime_details: showtimeDetails,
      movie_details: movieDetails,
      products_details: productsDetails,
    };
  }
}
