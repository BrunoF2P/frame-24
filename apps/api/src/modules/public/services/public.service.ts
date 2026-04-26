import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, products } from '@repo/db';
import { PrismaService } from 'src/prisma/prisma.service';
import { CinemaComplexesRepository } from 'src/modules/operations/cinema-complexes/repositories/cinema-complexes.repository';
import { ShowtimesRepository } from 'src/modules/operations/showtime_schedule/repositories/showtime.repository';
import { MovieRepository } from 'src/modules/catalog/movies/repositories/movie.repository';
import { ProductRepository } from 'src/modules/catalog/products/repositories/product.repository';
import { SeatsRepository } from 'src/modules/operations/seats/repositories/seats.repository';
import { SessionSeatStatusRepository } from 'src/modules/operations/session_seat_status/repositories/session-seat-status.repository';
import {
  extractTenantSlugFromHost,
  normalizeHost,
} from 'src/common/utils/tenant-host.util';

interface SeatMapStatusData {
  status: string;
  sale_id: string | null;
  reservation_uuid: string | null;
  expiration_date: Date | null;
}

interface ShowtimesFilterOptions {
  complexId?: string;
  movieId?: string;
  citySlug?: string;
  date?: string;
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

  private toLocalDateKey(date: Date, timeZone?: string | null) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || 'America/Bahia',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }

  private matchesLocalDate(
    date: Date,
    expectedDate: string | undefined,
    timeZone?: string | null,
  ) {
    if (!expectedDate) {
      return true;
    }

    return this.toLocalDateKey(date, timeZone) === expectedDate;
  }

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
        website: true,
        logo_url: true,
        city: true,
        state: true,
      },
      orderBy: {
        corporate_name: 'asc',
      },
    });
  }

  async resolveTenant(input: { host?: string; path?: string }) {
    const host = normalizeHost(input.host);
    const pathTenantSlug = input.path
      ?.split('?')[0]
      ?.split('/')
      .filter(Boolean)[0]
      ?.trim()
      .toLowerCase();
    const hostTenantSlug = extractTenantSlugFromHost(host);

    const company = await this.prisma.companies.findFirst({
      where: {
        active: true,
        suspended: false,
        OR: [
          ...(hostTenantSlug ? [{ tenant_slug: hostTenantSlug }] : []),
          ...(host
            ? [
                {
                  website: {
                    contains: host,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
              ]
            : []),
          ...(pathTenantSlug ? [{ tenant_slug: pathTenantSlug }] : []),
        ],
      },
      orderBy: {
        corporate_name: 'asc',
      },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return {
      company_id: company.id,
      tenant_slug: company.tenant_slug,
      corporate_name: company.corporate_name,
      trade_name: company.trade_name,
      website: company.website,
      logo_url: company.logo_url,
      active: company.active,
    };
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
    return complexes
      .filter((c) => c.active === true)
      .map((complex) => this.mapCinema(complex));
  }

  async getMovie(id: string) {
    return this.moviesRepository.findById(id);
  }

  async getCitiesByCompany(companyId: string) {
    const complexes = await this.prisma.cinema_complexes.findMany({
      where: {
        company_id: companyId,
        active: true,
        city: { not: null },
      },
      select: {
        city: true,
        state: true,
        city_slug: true,
        timezone: true,
      },
      orderBy: [{ state: 'asc' }, { city: 'asc' }],
    });

    const grouped = new Map<string, {
      id: string;
      slug: string;
      name: string;
      state: string | null;
      timezone: string | null;
      cinema_count: number;
    }>();

    for (const complex of complexes) {
      if (!complex.city) continue;
      const slug = complex.city_slug || this.slugify(complex.city);
      const key = `${complex.state || ''}:${slug}`;
      const current = grouped.get(key);
      if (current) {
        current.cinema_count += 1;
        continue;
      }
      grouped.set(key, {
        id: key,
        slug,
        name: complex.city,
        state: complex.state,
        timezone: complex.timezone,
        cinema_count: 1,
      });
    }

    return Array.from(grouped.values());
  }

  async getCinemasByCity(companyId: string, citySlug: string) {
    const complexes = await this.findActiveComplexes(companyId, citySlug);
    return complexes.map((complex) => this.mapCinema(complex));
  }

  async getMoviesByCompany(companyId: string) {
    const complexes = (
      await this.cinemaComplexesRepository.findAllByCompany(companyId)
    ).filter((complex) => complex.active !== false);
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

    const movies = await this.prisma.movies.findMany({
      where: {
        id: { in: movieIds },
        company_id: companyId,
        active: true,
      },
      include: this.moviePublicInclude(),
      orderBy: [{ brazil_title: 'asc' }, { original_title: 'asc' }],
    });

    return movies.map((movie) => {
      const movieShowtimes = activeShowtimes.filter(
        (showtime) => showtime.movie_id === movie.id,
      );
      return this.mapMovie(movie, {
        priceFrom: Math.min(
          ...movieShowtimes.map((item) => Number(item.base_ticket_price)),
        ),
        sessionCount: movieShowtimes.length,
        nextSession: movieShowtimes
          .map((item) => item.start_time)
          .sort((left, right) => left.getTime() - right.getTime())[0],
      });
    });
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
    const complexes = filters?.citySlug
      ? await this.findActiveComplexes(companyId, filters.citySlug)
      : (
          await this.cinemaComplexesRepository.findAllByCompany(companyId)
        ).filter((complex) => complex.active !== false);
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

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const skip = (page - 1) * limit;

    const showtimes = await this.prisma.showtime_schedule.findMany({
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
            slug: true,
            address: true,
            city: true,
            city_slug: true,
            state: true,
            latitude: true,
            longitude: true,
            timezone: true,
            active: true,
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
    });

    // Buscar filmes para cada sessão com includes
    const movieIds = [...new Set(showtimes.map((s) => s.movie_id))];
    const movies = await this.prisma.movies.findMany({
      where: {
        id: { in: movieIds },
        company_id: companyId,
      },
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
    const filteredShowtimes = showtimes.filter((showtime) =>
      this.matchesLocalDate(
        showtime.start_time,
        filters?.date,
        showtime.cinema_complexes?.timezone,
      ),
    );

    const items = filteredShowtimes.map((showtime) => {
      const movie = movieMap.get(showtime.movie_id);
      return {
        ...this.mapShowtime(showtime),
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
      total: items.length,
      total_pages: Math.max(1, Math.ceil(items.length / limit)),
    };
  }

  async getMoviesByCity(
    companyId: string,
    citySlug: string,
    options?: { status?: string; date?: string },
  ) {
    const complexes = await this.findActiveComplexes(companyId, citySlug);
    const complexIds = complexes.map((item) => item.id);
    if (complexIds.length === 0) {
      return [];
    }

    const showtimeWhere: Prisma.showtime_scheduleWhereInput = {
      cinema_complex_id: { in: complexIds },
      start_time: { gte: new Date() },
      session_status: { name: 'Aberta para Vendas' },
    };

    const showtimes = await this.prisma.showtime_schedule.findMany({
      where: showtimeWhere,
      select: {
        movie_id: true,
        base_ticket_price: true,
        start_time: true,
        cinema_complexes: {
          select: {
            timezone: true,
          },
        },
      },
    });
    const filteredShowtimes = showtimes.filter((showtime) =>
      this.matchesLocalDate(
        showtime.start_time,
        options?.date,
        showtime.cinema_complexes?.timezone,
      ),
    );
    const movieIds = [...new Set(filteredShowtimes.map((item) => item.movie_id))];
    if (movieIds.length === 0) {
      return [];
    }

    const movies = await this.prisma.movies.findMany({
      where: {
        id: { in: movieIds },
        company_id: companyId,
        active: options?.status === 'em-breve' ? undefined : true,
      },
      include: this.moviePublicInclude(),
      orderBy: [{ brazil_title: 'asc' }, { original_title: 'asc' }],
    });

    return movies.map((movie) => {
      const movieShowtimes = filteredShowtimes.filter(
        (item) => item.movie_id === movie.id,
      );
      return this.mapMovie(movie, {
        priceFrom: Math.min(
          ...movieShowtimes.map((item) => Number(item.base_ticket_price)),
        ),
        sessionCount: movieShowtimes.length,
        nextSession: movieShowtimes
          .map((item) => item.start_time)
          .sort((left, right) => left.getTime() - right.getTime())[0],
      });
    });
  }

  async getMovieBySlugForCity(
    companyId: string,
    citySlug: string,
    movieSlug: string,
  ) {
    const movie = await this.prisma.movies.findFirst({
      where: {
        company_id: companyId,
        active: true,
        OR: [{ slug: movieSlug }, { id: movieSlug }],
      },
      include: this.moviePublicInclude(),
    });

    if (!movie) {
      throw new NotFoundException('Filme não encontrado');
    }

    const showtimes = await this.getShowtimesForMovieSlug(
      companyId,
      citySlug,
      movieSlug,
    );
    if (showtimes.length === 0) {
      throw new NotFoundException('Filme não encontrado nesta cidade');
    }

    return {
      ...this.mapMovie(movie),
      showtimes,
    };
  }

  async getShowtimesForMovieSlug(
    companyId: string,
    citySlug: string,
    movieSlug: string,
    options?: {
      date?: string;
      format?: string;
      language?: string;
      cinemaId?: string;
    },
  ) {
    const movie = await this.prisma.movies.findFirst({
      where: {
        company_id: companyId,
        active: true,
        OR: [{ slug: movieSlug }, { id: movieSlug }],
      },
      select: { id: true },
    });
    if (!movie) {
      throw new NotFoundException('Filme não encontrado');
    }

    const complexes = await this.findActiveComplexes(companyId, citySlug);
    const complexIds = options?.cinemaId
      ? complexes.filter((complex) => complex.id === options.cinemaId).map((complex) => complex.id)
      : complexes.map((complex) => complex.id);

    const where: Prisma.showtime_scheduleWhereInput = {
      movie_id: movie.id,
      cinema_complex_id: { in: complexIds },
      start_time: { gte: new Date() },
      available_seats: { gt: 0 },
      session_status: { name: 'Aberta para Vendas' },
      ...(options?.format && {
        projection_types: { name: { contains: options.format, mode: 'insensitive' } },
      }),
      ...(options?.language && {
        session_languages: { name: { contains: options.language, mode: 'insensitive' } },
      }),
    };

    const showtimes = await this.prisma.showtime_schedule.findMany({
      where,
      include: {
        cinema_complexes: true,
        rooms: true,
        projection_types: true,
        audio_types: true,
        session_languages: true,
        session_status: true,
      },
      orderBy: { start_time: 'asc' },
    });
    return showtimes
      .filter((showtime) =>
        this.matchesLocalDate(
          showtime.start_time,
          options?.date,
          showtime.cinema_complexes?.timezone,
        ),
      )
      .map((showtime) => this.mapShowtime(showtime));
  }

  async searchTenantStorefront(
    companyId: string,
    query: string,
    citySlug?: string,
  ) {
    const normalized = this.slugify(query);
    if (!normalized) {
      return [];
    }

    const [cities, cinemas, movies] = await Promise.all([
      this.getCitiesByCompany(companyId),
      citySlug
        ? this.getCinemasByCity(companyId, citySlug)
        : this.getComplexesByCompany(companyId),
      citySlug
        ? this.getMoviesByCity(companyId, citySlug)
        : this.getMoviesByCompany(companyId),
    ]);

    const cityHits = cities
      .filter((city) => this.slugify(city.name).includes(normalized))
      .map((city) => ({
        id: city.id,
        type: 'city',
        title: city.name,
        subtitle: city.state,
        href: `/cidade/${city.slug}`,
      }));
    const cinemaHits = cinemas
      .filter((cinema) => this.slugify(cinema.name).includes(normalized))
      .map((cinema) => ({
        id: cinema.id,
        type: 'cinema',
        title: cinema.name,
        subtitle: cinema.neighborhood || cinema.city,
        href: `/cinema/${cinema.slug}`,
      }));
    const movieHits = movies
      .filter((movie) => this.slugify(movie.title).includes(normalized))
      .map((movie) => ({
        id: movie.id,
        type: 'movie',
        title: movie.title,
        subtitle: movie.synopsis || 'Sessões disponíveis',
        href: `/cidade/${citySlug || movie.city_slugs?.[0] || ''}/filme/${movie.slug || movie.id}`,
      }));

    return [...movieHits, ...cinemaHits, ...cityHits].slice(0, 8);
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
        seat_kind: this.mapSeatKind(seat.seat_types?.name, seat.accessible),
        pricing_zone: Number(seat.seat_types?.additional_value || 0) > 0 ? 'premium' : 'standard',
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
            timezone: showtimeDetails.cinema_complexes.timezone,
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
              company_id: companyId,
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
      citySlug?: string;
      date?: string;
      showtimesPage?: number;
      showtimesLimit?: number;
    },
  ) {
    const company = await this.getCompanyBySlug(tenantSlug);

    const [
      complexes,
      cities,
      movies,
      products,
      ticketTypes,
      paymentMethods,
      showtimes,
    ] = await Promise.all([
      options?.citySlug
        ? this.getCinemasByCity(company.id, options.citySlug)
        : this.getComplexesByCompany(company.id),
      this.getCitiesByCompany(company.id),
      options?.citySlug
        ? this.getMoviesByCity(company.id, options.citySlug, { date: options.date })
        : this.getMoviesByCompany(company.id),
      this.getProductsByCompany(company.id, options?.complexId),
      this.getTicketTypes(company.id),
      this.getPaymentMethods(company.id),
      options?.includeShowtimes
        ? this.getShowtimesByCompanyPaginated(company.id, {
            complexId: options?.complexId,
            movieId: options?.movieId,
            citySlug: options?.citySlug,
            date: options?.date,
            page: options?.showtimesPage,
            limit: options?.showtimesLimit,
          })
        : Promise.resolve(null),
    ]);

    return {
      company,
      cities,
      complexes,
      movies,
      products,
      ticket_types: ticketTypes,
      payment_methods: paymentMethods,
      showtimes,
    };
  }

  private async findActiveComplexes(companyId: string, citySlug?: string) {
    const complexes = await this.prisma.cinema_complexes.findMany({
      where: {
        company_id: companyId,
        active: true,
      },
      orderBy: { name: 'asc' },
    });

    if (!citySlug) {
      return complexes;
    }

    return complexes.filter(
      (complex) => (complex.city_slug || this.slugify(complex.city || '')) === citySlug,
    );
  }

  private mapCinema(complex: {
    id: string;
    name: string;
    slug?: string | null;
    code?: string | null;
    address?: string | null;
    city?: string | null;
    city_slug?: string | null;
    state?: string | null;
    latitude?: unknown;
    longitude?: unknown;
    timezone?: string | null;
    active?: boolean | null;
  }) {
    return {
      id: complex.id,
      slug: complex.slug || this.slugify(`${complex.name}-${complex.id.slice(0, 8)}`),
      code: complex.code,
      name: complex.name,
      city: complex.city,
      city_slug: complex.city_slug || this.slugify(complex.city || ''),
      state: complex.state,
      neighborhood: null,
      address: complex.address,
      latitude: complex.latitude?.toString?.() ?? null,
      longitude: complex.longitude?.toString?.() ?? null,
      timezone: complex.timezone,
      active: complex.active !== false,
    };
  }

  private moviePublicInclude() {
    return {
      age_rating: true,
      movie_media: {
        where: { active: true },
        include: { media_types: true },
        take: 4,
      },
      category_links: {
        include: {
          category: true,
        },
      },
      movie_cast: {
        take: 8,
        orderBy: { credit_order: 'asc' as const },
      },
    };
  }

  private mapMovie(
    movie: Prisma.moviesGetPayload<{
      include: ReturnType<PublicService['moviePublicInclude']>;
    }>,
    stats?: { priceFrom?: number; sessionCount?: number; nextSession?: Date },
  ) {
    const poster =
      movie.movie_media.find((media) => this.normalize(media.media_types?.name || '').includes('poster')) ??
      movie.movie_media[0];
    const backdrop =
      movie.movie_media.find((media) => this.normalize(media.media_types?.name || '').includes('backdrop')) ??
      movie.movie_media[1] ??
      poster;

    return {
      id: movie.id,
      slug: movie.slug || movie.id,
      title: movie.brazil_title || movie.original_title,
      original_title: movie.original_title,
      synopsis: movie.synopsis || movie.short_synopsis,
      short_synopsis: movie.short_synopsis,
      runtime_minutes: movie.duration_minutes,
      age_rating: movie.age_rating?.code || null,
      genres: movie.category_links.map((link) => link.category.name),
      poster_url: poster?.media_url || movie.tmdb_poster_path || null,
      backdrop_url: backdrop?.media_url || null,
      release_date: movie.worldwide_release_date?.toISOString() || null,
      cast: movie.movie_cast.map((cast) => cast.artist_name),
      price_from: stats?.priceFrom ?? null,
      session_count: stats?.sessionCount ?? 0,
      next_session: stats?.nextSession?.toISOString() ?? null,
      city_slugs: [],
    };
  }

  private mapShowtime(
    showtime: {
      id: string;
      movie_id: string;
      cinema_complex_id?: string;
      start_time: Date;
      end_time: Date;
      base_ticket_price: Prisma.Decimal | number;
      available_seats: number | null;
      sold_seats: number | null;
      blocked_seats: number | null;
      cinema_complexes: {
        id: string;
        name: string;
        slug: string | null;
        address: string | null;
        city: string | null;
        city_slug: string | null;
        state: string | null;
        latitude?: Prisma.Decimal | null;
        longitude?: Prisma.Decimal | null;
        timezone: string | null;
        active: boolean | null;
      };
      rooms: {
        id: string;
        name: string | null;
        room_number: string;
      } | null;
      projection_types: {
        id: string;
        name: string;
      } | null;
      audio_types: {
        id: string;
        name: string;
      } | null;
      session_languages: {
        id: string;
        name: string;
      } | null;
      session_status: {
        id: string;
        name: string;
      } | null;
    },
  ) {
    const totalSeats =
      (showtime.available_seats || 0) +
      (showtime.sold_seats || 0) +
      (showtime.blocked_seats || 0);
    const soldRatio = totalSeats > 0 ? (showtime.sold_seats || 0) / totalSeats : 0;
    const timeZone = showtime.cinema_complexes?.timezone || 'America/Bahia';

    return {
      id: showtime.id,
      movie_id: showtime.movie_id,
      cinema_id: showtime.cinema_complex_id || showtime.cinema_complexes.id,
      cinema: this.mapCinema(showtime.cinema_complexes),
      room: showtime.rooms
        ? {
            id: showtime.rooms.id,
            name: showtime.rooms.name,
            room_number: showtime.rooms.room_number,
          }
        : null,
      start_time: showtime.start_time.toISOString(),
      end_time: showtime.end_time.toISOString(),
      date: this.toLocalDateKey(showtime.start_time, timeZone),
      time: new Intl.DateTimeFormat('pt-BR', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(showtime.start_time),
      format: showtime.projection_types?.name || null,
      audio: showtime.audio_types?.name || null,
      language: showtime.session_languages?.name || null,
      status: showtime.session_status?.name || null,
      price_from: Number(showtime.base_ticket_price),
      available_seats: showtime.available_seats || 0,
      sold_seats: showtime.sold_seats || 0,
      blocked_seats: showtime.blocked_seats || 0,
      occupancy:
        soldRatio >= 0.75 ? 'high' : soldRatio >= 0.4 ? 'medium' : 'low',
    };
  }

  private mapSeatKind(name?: string | null, accessible?: boolean | null) {
    const normalized = this.normalize(name || '');
    if (accessible) return 'wheelchair';
    if (normalized.includes('vip')) return 'vip_recliner';
    if (normalized.includes('casal')) return 'couple_left';
    if (normalized.includes('premium')) return 'premium_motion';
    return 'standard';
  }

  private slugify(value: string) {
    return this.normalize(value)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private normalize(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  async getSaleDetails(companyId: string, publicReference: string) {
    const complexes =
      await this.cinemaComplexesRepository.findAllByCompany(companyId);
    const complexIds = complexes.map((c) => c.id);

    const sale = await this.prisma.sales.findFirst({
      where: {
        OR: [{ public_reference: publicReference }, { id: publicReference }],
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
        where: { company_id: companyId, id: { in: productIds } },
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
