import { NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MovieRepository } from 'src/modules/catalog/movies/repositories/movie.repository';
import { ProductRepository } from 'src/modules/catalog/products/repositories/product.repository';
import { CinemaComplexesRepository } from 'src/modules/operations/cinema-complexes/repositories/cinema-complexes.repository';
import { SeatsRepository } from 'src/modules/operations/seats/repositories/seats.repository';
import { SessionSeatStatusRepository } from 'src/modules/operations/session_seat_status/repositories/session-seat-status.repository';
import { ShowtimesRepository } from 'src/modules/operations/showtime_schedule/repositories/showtime.repository';
import { PublicService } from './public.service';

describe('PublicService', () => {
  let service: PublicService;
  let prisma: jest.Mocked<PrismaService>;
  let cinemaComplexesRepository: jest.Mocked<CinemaComplexesRepository>;
  let showtimesRepository: jest.Mocked<ShowtimesRepository>;
  let moviesRepository: jest.Mocked<MovieRepository>;
  let productsRepository: jest.Mocked<ProductRepository>;
  let seatsRepository: jest.Mocked<SeatsRepository>;
  let sessionSeatStatusRepository: jest.Mocked<SessionSeatStatusRepository>;
  let companiesFindUnique: jest.Mock;
  let productPricesFindFirst: jest.Mock;
  let salesFindFirst: jest.Mock;

  beforeEach(() => {
    companiesFindUnique = jest.fn();
    productPricesFindFirst = jest.fn();
    salesFindFirst = jest.fn();

    prisma = {
      companies: { findMany: jest.fn(), findUnique: companiesFindUnique },
      showtime_schedule: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
      },
      movies: { findMany: jest.fn(), findUnique: jest.fn() },
      product_prices: { findFirst: productPricesFindFirst },
      ticket_types: { findMany: jest.fn() },
      payment_methods: { findMany: jest.fn() },
      sales: { findFirst: salesFindFirst },
      products: { findMany: jest.fn() },
    } as unknown as jest.Mocked<PrismaService>;

    cinemaComplexesRepository = {
      findAllByCompany: jest.fn(),
    } as unknown as jest.Mocked<CinemaComplexesRepository>;

    showtimesRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
    } as unknown as jest.Mocked<ShowtimesRepository>;

    moviesRepository = {
      findById: jest.fn(),
      findByIds: jest.fn(),
    } as unknown as jest.Mocked<MovieRepository>;

    productsRepository = {
      findAll: jest.fn(),
    } as unknown as jest.Mocked<ProductRepository>;

    seatsRepository = {
      findByRoomId: jest.fn(),
    } as unknown as jest.Mocked<SeatsRepository>;

    sessionSeatStatusRepository = {
      findByShowtimeId: jest.fn(),
    } as unknown as jest.Mocked<SessionSeatStatusRepository>;

    service = new PublicService(
      prisma,
      cinemaComplexesRepository,
      showtimesRepository,
      moviesRepository,
      productsRepository,
      seatsRepository,
      sessionSeatStatusRepository,
    );
  });

  it('should return only active complexes in getComplexesByCompany', async () => {
    cinemaComplexesRepository.findAllByCompany.mockResolvedValue([
      { id: 'c1', active: true },
      { id: 'c2', active: false },
    ] as never);

    const result = await service.getComplexesByCompany('company-1');

    expect(result).toEqual([{ id: 'c1', active: true }]);
  });

  it('should throw when company by slug is missing or inactive', async () => {
    companiesFindUnique.mockResolvedValue(null);
    await expect(service.getCompanyBySlug('tenant-a')).rejects.toThrow(
      NotFoundException,
    );

    companiesFindUnique.mockResolvedValue({ active: false, suspended: false });
    await expect(service.getCompanyBySlug('tenant-b')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should return empty list when company has no active movie showtimes', async () => {
    cinemaComplexesRepository.findAllByCompany.mockResolvedValue([
      { id: 'cx-1' },
    ] as never);
    showtimesRepository.findAll.mockResolvedValue([] as never);

    const result = await service.getMoviesByCompany('company-1');

    expect(moviesRepository.findByIds).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('should fetch unique movies from active showtimes', async () => {
    cinemaComplexesRepository.findAllByCompany.mockResolvedValue([
      { id: 'cx-1' },
    ] as never);
    showtimesRepository.findAll.mockResolvedValue([
      { movie_id: 'm1' },
      { movie_id: 'm1' },
      { movie_id: 'm2' },
    ] as never);
    moviesRepository.findByIds.mockResolvedValue([
      { id: 'm1' },
      { id: 'm2' },
    ] as never);

    const result = await service.getMoviesByCompany('company-1');

    expect(moviesRepository.findByIds).toHaveBeenCalledWith(['m1', 'm2']);
    expect(result).toEqual([{ id: 'm1' }, { id: 'm2' }]);
  });

  it('should return priced products only when complexId is provided', async () => {
    productsRepository.findAll.mockResolvedValue([
      { id: 'p1' },
      { id: 'p2' },
    ] as never);
    productPricesFindFirst
      .mockResolvedValueOnce({ sale_price: 10 } as never)
      .mockResolvedValueOnce(null as never);

    const result = await service.getProductsByCompany('company-1', 'complex-1');

    expect(result).toEqual([{ id: 'p1', price: 10 }]);
  });

  it('should throw not found when sale details are absent', async () => {
    cinemaComplexesRepository.findAllByCompany.mockResolvedValue([
      { id: 'cx-1' },
    ] as never);
    salesFindFirst.mockResolvedValue(null);

    await expect(
      service.getSaleDetails('company-1', 'PUB-123'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should list future showtimes with movie enrichments', async () => {
    cinemaComplexesRepository.findAllByCompany.mockResolvedValue([
      { id: 'cx-1' },
    ] as never);
    const future = new Date(Date.now() + 60 * 60 * 1000);
    (prisma.showtime_schedule.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'show-1',
        movie_id: 'm1',
        start_time: future,
        cinema_complexes: { id: 'cx-1', name: 'Complexo', address: 'Rua A' },
        rooms: { id: 'room-1', name: 'Sala 1', room_number: 1 },
        projection_types: { id: 'p1', name: '2D' },
        audio_types: { id: 'a1', name: 'Dublado' },
        session_languages: { id: 'l1', name: 'PT-BR' },
        session_status: { id: 'ss1', name: 'Aberta para Vendas' },
      },
    ] as never);
    (prisma.showtime_schedule.count as jest.Mock).mockResolvedValue(1);
    (prisma.movies.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'm1',
        brazil_title: 'Filme 1',
        original_title: 'Movie 1',
        duration_minutes: 120,
        age_rating: { code: '14' },
        movie_media: [{ media_url: 'poster.jpg' }],
      },
    ] as never);

    const result = await service.getShowtimesByCompany('company-1');

    expect(result).toHaveLength(1);
    expect(result[0].movie).toEqual(
      expect.objectContaining({
        id: 'm1',
        title: 'Filme 1',
        poster_url: 'poster.jpg',
      }),
    );
  });

  it('should throw not found when showtime is absent in seat map', async () => {
    showtimesRepository.findById.mockResolvedValue(null as never);

    await expect(service.getShowtimeSeatsMap('show-404')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should assemble seat map details for a showtime', async () => {
    showtimesRepository.findById.mockResolvedValue({
      id: 'show-1',
      room_id: 'room-1',
      available_seats: 10,
      sold_seats: 5,
      base_ticket_price: 25,
    } as never);
    seatsRepository.findByRoomId.mockResolvedValue([
      {
        id: 'seat-1',
        seat_code: 'A1',
        row_code: 'A',
        column_number: 1,
        accessible: false,
        seat_types: { name: 'Padrão', additional_value: 0 },
      },
    ] as never);
    sessionSeatStatusRepository.findByShowtimeId.mockResolvedValue([
      {
        seat_id: 'seat-1',
        sale_id: null,
        reservation_uuid: 'res-1',
        expiration_date: new Date(Date.now() + 60000),
        seat_status: { name: 'Reservado' },
      },
    ] as never);
    (prisma.showtime_schedule.findUnique as jest.Mock).mockResolvedValue({
      id: 'show-1',
      movie_id: 'm1',
      start_time: new Date(),
      cinema_complexes: { id: 'cx-1', name: 'Complexo' },
      rooms: { name: 'Sala 1' },
    } as never);
    (prisma.movies.findUnique as jest.Mock).mockResolvedValue({
      brazil_title: 'Filme 1',
      original_title: 'Movie 1',
      movie_media: [{ media_url: 'poster.jpg' }],
    } as never);

    const result = await service.getShowtimeSeatsMap('show-1');

    expect(result.seats).toHaveLength(1);
    expect(result.seats[0]).toEqual(
      expect.objectContaining({
        seat_code: 'A1',
        status: 'Reservado',
        reserved: true,
      }),
    );
    expect(result.movie).toEqual(
      expect.objectContaining({ title: 'Filme 1', poster_url: 'poster.jpg' }),
    );
  });

  it('should return detailed sale payload when sale exists', async () => {
    cinemaComplexesRepository.findAllByCompany.mockResolvedValue([
      { id: 'cx-1' },
    ] as never);
    salesFindFirst.mockResolvedValue({
      id: 'sale-1',
      tickets: [{ showtime_id: 'show-1', ticket_types: { name: 'Inteira' } }],
      concession_sales: [
        {
          concession_sale_items: [{ item_type: 'PRODUCT', item_id: 'prod-1' }],
        },
      ],
    } as never);
    (prisma.showtime_schedule.findUnique as jest.Mock).mockResolvedValue({
      id: 'show-1',
      movie_id: 'm1',
      rooms: { name: 'Sala 1' },
      cinema_complexes: { name: 'Complexo' },
    } as never);
    (prisma.movies.findUnique as jest.Mock).mockResolvedValue({
      id: 'm1',
      brazil_title: 'Filme 1',
    } as never);
    (prisma.products.findMany as jest.Mock).mockResolvedValue([
      { id: 'prod-1', name: 'Pipoca' },
    ] as never);

    const result = await service.getSaleDetails('company-1', 'PUB-1');

    expect(result.id).toBe('sale-1');
    expect(result.products_details).toEqual([{ id: 'prod-1', name: 'Pipoca' }]);
  });
});
