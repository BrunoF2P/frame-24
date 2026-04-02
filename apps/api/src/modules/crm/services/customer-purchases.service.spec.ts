import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { LoggerService } from 'src/common/services/logger.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { SalesRepository } from 'src/modules/sales/repositories/sales.repository';
import { SalesService } from 'src/modules/sales/services/sales.service';
import { CompanyCustomersRepository } from '../repositories/company-customers.repository';
import { CustomerPurchasesService } from './customer-purchases.service';

describe('CustomerPurchasesService', () => {
  let service: CustomerPurchasesService;
  let salesService: jest.Mocked<SalesService>;
  let salesRepository: jest.Mocked<SalesRepository>;
  let companyCustomersRepository: jest.Mocked<CompanyCustomersRepository>;
  let prisma: any;
  let logger: jest.Mocked<LoggerService>;
  let cls: jest.Mocked<ClsService>;

  beforeEach(() => {
    salesService = {
      create: jest.fn(),
      cancel: jest.fn(),
    } as unknown as jest.Mocked<SalesService>;

    salesRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
    } as unknown as jest.Mocked<SalesRepository>;

    companyCustomersRepository = {
      findByCompanyAndCustomer: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<CompanyCustomersRepository>;

    prisma = {
      sales: {
        findMany: jest.fn(),
      },
      tickets: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      showtime_schedule: {
        findMany: jest.fn(),
      },
      seats: {
        findMany: jest.fn(),
      },
      movies: {
        findMany: jest.fn(),
      },
    } as any;

    logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;

    cls = {
      get: jest.fn((key: string) => {
        if (key === 'companyId') return 'company-1';
        if (key === 'customerId') return 'customer-1';
        return undefined;
      }),
    } as unknown as jest.Mocked<ClsService>;

    service = new CustomerPurchasesService(
      salesService,
      salesRepository,
      companyCustomersRepository,
      prisma,
      logger,
      cls,
    );
  });

  it('should block purchase when requested points exceed available points', async () => {
    companyCustomersRepository.findByCompanyAndCustomer.mockResolvedValue({
      accumulated_points: 10,
    } as never);

    await expect(
      service.purchase({
        cinema_complex_id: 'complex-1',
        payment_method: 'pix',
        tickets: [],
        use_points: 100,
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('should block ticket access from another customer', async () => {
    prisma.tickets.findFirst.mockResolvedValue({
      id: 'ticket-1',
      sales: {
        id: 'sale-1',
        sale_number: 'V001',
        sale_date: new Date('2026-03-01'),
        cinema_complex_id: 'complex-1',
        customer_id: 'other-customer',
      },
    } as never);

    await expect(service.findTicketById('ticket-1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should return qr code payload for own ticket', async () => {
    prisma.tickets.findFirst.mockResolvedValue({
      id: 'ticket-1',
      ticket_number: 'TK001',
      showtime_id: 'show-1',
      sales: {
        id: 'sale-1',
        sale_number: 'V001',
        sale_date: new Date('2026-03-01'),
        cinema_complex_id: 'complex-1',
        customer_id: 'customer-1',
      },
    } as never);

    const result = await service.getTicketQrCode('ticket-1');

    expect(result.payload).toContain('"ticket_id":"ticket-1"');
    expect(typeof result.base64).toBe('string');
    expect(result.base64.length).toBeGreaterThan(10);
  });

  it('should block cancel when sale does not belong to customer', async () => {
    salesRepository.findById.mockResolvedValue({
      id: 'sale-1',
      customer_id: 'other-customer',
    } as never);

    await expect(service.cancelPurchase('sale-1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should cancel own purchase', async () => {
    salesRepository.findById.mockResolvedValue({
      id: 'sale-1',
      customer_id: 'customer-1',
    } as never);
    salesService.cancel.mockResolvedValue(undefined as never);

    await service.cancelPurchase('sale-1');

    expect(salesService.cancel).toHaveBeenCalledWith(
      'sale-1',
      'Cancelado pelo cliente',
    );
  });

  it('should throw when customer context is missing', async () => {
    cls.get.mockReturnValue(undefined);

    await expect(service.findAll()).rejects.toThrow(ForbiddenException);
  });

  it('should throw when ticket is not found', async () => {
    prisma.tickets.findFirst.mockResolvedValue(null);

    await expect(service.findTicketById('ticket-404')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should create purchase, accumulate and deduct points when use_points is provided', async () => {
    companyCustomersRepository.findByCompanyAndCustomer
      .mockResolvedValueOnce({ accumulated_points: 1000 } as never)
      .mockResolvedValueOnce({
        accumulated_points: 50,
        loyalty_level: 'BRONZE',
      } as never)
      .mockResolvedValueOnce({ accumulated_points: 50 } as never)
      .mockResolvedValueOnce({
        accumulated_points: 950,
        loyalty_level: 'BRONZE',
      } as never);

    salesService.create.mockResolvedValue({
      id: 'sale-1',
      sale_number: 'V001',
      cinema_complex_id: 'complex-1',
      customer_id: 'customer-1',
      sale_date: new Date('2026-03-01T10:00:00.000Z').toISOString(),
      total_amount: '100',
      discount_amount: '0',
      net_amount: '2500.90',
      tickets: [],
    } as never);

    await service.purchase({
      cinema_complex_id: 'complex-1',
      payment_method: 'pix',
      tickets: [],
      discount_amount: 5,
      use_points: 100,
    } as any);

    expect(salesService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: 'customer-1',
        discount_amount: 6,
      }),
    );
    expect(companyCustomersRepository.update).toHaveBeenCalledWith(
      'company-1',
      'customer-1',
      { accumulated_points: 2550 },
    );
    expect(companyCustomersRepository.update).toHaveBeenCalledWith(
      'company-1',
      'customer-1',
      expect.objectContaining({ loyalty_level: expect.any(String) }),
    );
    expect(companyCustomersRepository.update).toHaveBeenCalledWith(
      'company-1',
      'customer-1',
      expect.objectContaining({ accumulated_points: expect.any(Number) }),
    );
  });

  it('should map sale data in findAll including showtime/movie/seat details', async () => {
    prisma.sales.findMany.mockResolvedValue([
      {
        id: 'sale-1',
        sale_number: 'V001',
        cinema_complex_id: 'complex-1',
        customer_id: 'customer-1',
        sale_date: new Date('2026-03-01T10:00:00.000Z'),
        total_amount: 120,
        discount_amount: 0,
        net_amount: 120,
        created_at: new Date('2026-03-01T10:00:00.000Z'),
        sale_types: { name: 'Online' },
        payment_methods: { name: 'PIX' },
        sale_status: { name: 'Aprovada' },
        concession_sales: [],
        tickets: [
          {
            id: 'ticket-1',
            ticket_number: 'TK001',
            showtime_id: 'show-1',
            seat_id: 'seat-1',
            face_value: 50,
            service_fee: 2,
            total_amount: 52,
            used: false,
            usage_date: null,
            ticket_types: { name: 'Inteira' },
          },
        ],
      },
    ] as never);

    prisma.showtime_schedule.findMany.mockResolvedValue([
      {
        id: 'show-1',
        movie_id: 'movie-1',
        start_time: new Date('2026-03-02T20:00:00.000Z'),
        cinema_complexes: { name: 'Complexo Centro' },
        rooms: { name: 'Sala 1' },
        projection_types: null,
        audio_types: null,
        session_languages: null,
      },
    ] as never);

    prisma.seats.findMany.mockResolvedValue([
      {
        id: 'seat-1',
        seat_code: 'A1',
        row_code: 'A',
        column_number: 1,
        seat_types: { name: 'VIP' },
      },
    ] as never);

    prisma.movies.findMany.mockResolvedValue([
      {
        id: 'movie-1',
        brazil_title: 'Filme BR',
        original_title: 'Movie Original',
        duration_minutes: 130,
        age_rating: { code: '16' },
        movie_media: [{ media_url: 'https://img/poster.jpg' }],
      },
    ] as never);

    const result = await service.findAll();

    expect(result).toHaveLength(1);
    expect(result[0].tickets[0].seat).toEqual(
      expect.objectContaining({
        seat_code: 'A1',
        seat_type: 'VIP',
      }),
    );
    expect(result[0].showtime).toEqual(
      expect.objectContaining({
        id: 'show-1',
        cinema: 'Complexo Centro',
        room: 'Sala 1',
      }),
    );
    expect(result[0].movie).toEqual(
      expect.objectContaining({
        id: 'movie-1',
        title: 'Filme BR',
        poster_url: 'https://img/poster.jpg',
      }),
    );
  });

  it('should return mapped DTO in findOne for own purchase', async () => {
    salesRepository.findById.mockResolvedValue({
      id: 'sale-1',
      sale_number: 'V001',
      cinema_complex_id: 'complex-1',
      customer_id: 'customer-1',
      sale_date: new Date('2026-03-01T10:00:00.000Z'),
      total_amount: 99,
      discount_amount: 1,
      net_amount: 98,
      sale_types: { name: 'Online' },
      payment_methods: { name: 'PIX' },
      sale_status: { name: 'Aprovada' },
      tickets: [
        {
          id: 'ticket-1',
          ticket_number: 'TK001',
          seat: 'A1',
          face_value: 45,
          service_fee: 4,
          total_amount: 49,
          used: false,
          usage_date: null,
        },
      ],
      created_at: new Date('2026-03-01T10:00:00.000Z'),
    } as never);

    const result = await service.findOne('sale-1');

    expect(result.id).toBe('sale-1');
    expect(result.tickets).toHaveLength(1);
    expect(result.tickets[0].seat).toBe('A1');
  });

  it('should list only tickets linked to a sale in findTickets', async () => {
    salesRepository.findAll.mockResolvedValue([
      { id: 'sale-1' },
      { id: 'sale-2' },
    ] as never);

    prisma.tickets.findMany.mockResolvedValue([
      {
        id: 'ticket-1',
        ticket_number: 'TK001',
        seat: 'A1',
        face_value: 50,
        service_fee: 2,
        total_amount: 52,
        used: false,
        usage_date: null,
        created_at: new Date('2026-03-01T10:00:00.000Z'),
        sales: {
          id: 'sale-1',
          sale_number: 'V001',
          sale_date: new Date('2026-03-01T10:00:00.000Z'),
          cinema_complex_id: 'complex-1',
          customer_id: 'customer-1',
        },
      },
      {
        id: 'ticket-2',
        ticket_number: 'TK002',
        seat: 'B1',
        face_value: 50,
        service_fee: 2,
        total_amount: 52,
        used: false,
        usage_date: null,
        created_at: new Date('2026-03-01T10:00:00.000Z'),
        sales: null,
      },
    ] as never);

    const result = await service.findTickets();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('ticket-1');
  });

  it('should return purchase and ticket history', async () => {
    const findAllSpy = jest
      .spyOn(service, 'findAll')
      .mockResolvedValue([] as any);
    const findTicketsSpy = jest
      .spyOn(service, 'findTickets')
      .mockResolvedValue([] as any);

    const result = await service.getHistory();

    expect(findAllSpy).toHaveBeenCalledTimes(1);
    expect(findTicketsSpy).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ purchases: [], tickets: [] });
  });
});
