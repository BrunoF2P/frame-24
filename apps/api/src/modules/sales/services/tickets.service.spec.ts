import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { LoggerService } from 'src/common/services/logger.service';
import { SeatStatusRepository } from 'src/modules/operations/seat-status/repositories/seat-status.repository';
import { SeatsRepository } from 'src/modules/operations/seats/repositories/seats.repository';
import { SessionSeatStatusRepository } from 'src/modules/operations/session_seat_status/repositories/session-seat-status.repository';
import { ShowtimesRepository } from 'src/modules/operations/showtime_schedule/repositories/showtime.repository';
import { TicketsRepository } from '../repositories/tickets.repository';
import { TicketsService } from './tickets.service';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _key: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

describe('TicketsService', () => {
  let service: TicketsService;
  let ticketsRepository: jest.Mocked<TicketsRepository>;
  let showtimesRepository: jest.Mocked<ShowtimesRepository>;
  let sessionSeatStatusRepository: jest.Mocked<SessionSeatStatusRepository>;
  let seatStatusRepository: jest.Mocked<SeatStatusRepository>;
  let seatsRepository: jest.Mocked<SeatsRepository>;
  let logger: jest.Mocked<LoggerService>;
  let cls: jest.Mocked<ClsService>;

  beforeEach(() => {
    ticketsRepository = {
      findTicketTypeById: jest.fn(),
    } as unknown as jest.Mocked<TicketsRepository>;

    showtimesRepository = {
      findById: jest.fn(),
      update: jest.fn(),
      reserveSeatsCountersAtomically: jest.fn(),
      releaseSeatsCountersSafely: jest.fn(),
    } as unknown as jest.Mocked<ShowtimesRepository>;

    sessionSeatStatusRepository = {
      findBySeatAndShowtime: jest.fn(),
      updateMany: jest.fn(),
      updateStatus: jest.fn(),
    } as unknown as jest.Mocked<SessionSeatStatusRepository>;

    seatStatusRepository = {
      findByNameAndCompany: jest.fn(),
    } as unknown as jest.Mocked<SeatStatusRepository>;

    seatsRepository = {
      findById: jest.fn(),
      findByIdWithSeatType: jest.fn(),
    } as unknown as jest.Mocked<SeatsRepository>;

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
        return undefined;
      }),
    } as unknown as jest.Mocked<ClsService>;

    service = new TicketsService(
      ticketsRepository,
      showtimesRepository,
      sessionSeatStatusRepository,
      seatStatusRepository,
      seatsRepository,
      logger,
      cls,
    );
  });

  it('should reject seat validation when showtime does not exist', async () => {
    showtimesRepository.findById.mockResolvedValue(null);

    await expect(
      service.validateAndReserveSeats({
        showtimeId: 'show-1',
        seatIds: ['s1'],
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should reject seat validation when showtime belongs to another company', async () => {
    showtimesRepository.findById.mockResolvedValue({
      id: 'show-1',
      start_time: new Date(Date.now() + 100000),
      cinema_complexes: { company_id: 'company-2' },
    } as never);

    await expect(
      service.validateAndReserveSeats({
        showtimeId: 'show-1',
        seatIds: ['s1'],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject occupied seat during validation', async () => {
    showtimesRepository.findById.mockResolvedValue({
      id: 'show-1',
      start_time: new Date(Date.now() + 100000),
      cinema_complexes: { company_id: 'company-1' },
    } as never);
    seatStatusRepository.findByNameAndCompany.mockResolvedValue({
      id: 'sold-status',
    } as never);
    seatsRepository.findById.mockResolvedValue({
      id: 's1',
      seat_code: 'A1',
    } as never);
    sessionSeatStatusRepository.findBySeatAndShowtime.mockResolvedValue({
      status: 'sold-status',
      sale_id: 'sale-1',
    } as never);

    await expect(
      service.validateAndReserveSeats({
        showtimeId: 'show-1',
        seatIds: ['s1'],
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should reserve seats and update showtime counters', async () => {
    seatStatusRepository.findByNameAndCompany.mockResolvedValue({
      id: 'sold-status',
    } as never);
    sessionSeatStatusRepository.updateMany.mockResolvedValue({
      count: 1,
    } as never);
    showtimesRepository.reserveSeatsCountersAtomically.mockResolvedValue(true);

    await service.reserveSeats({
      showtimeId: 'show-1',
      seatIds: ['s1', 's2'],
      saleId: 'sale-1',
    });

    expect(sessionSeatStatusRepository.updateMany).toHaveBeenCalledTimes(2);
    expect(
      showtimesRepository.reserveSeatsCountersAtomically,
    ).toHaveBeenCalledWith('show-1', 2);
  });

  it('should release sold seats and rollback counters', async () => {
    seatStatusRepository.findByNameAndCompany.mockResolvedValueOnce({
      id: 'available-status',
    } as never);

    sessionSeatStatusRepository.findBySeatAndShowtime
      .mockResolvedValueOnce({ sale_id: 'sale-1' } as never)
      .mockResolvedValueOnce({ sale_id: null } as never);
    sessionSeatStatusRepository.updateStatus.mockResolvedValue({
      id: 'row-1',
    } as never);
    showtimesRepository.releaseSeatsCountersSafely.mockResolvedValue(true);

    await service.releaseSeats({ showtimeId: 'show-1', seatIds: ['s1', 's2'] });

    expect(sessionSeatStatusRepository.updateStatus).toHaveBeenCalledTimes(1);
    expect(showtimesRepository.releaseSeatsCountersSafely).toHaveBeenCalledWith(
      'show-1',
      1,
    );
  });

  it('should calculate ticket price with seat additional and ticket discount', async () => {
    showtimesRepository.findById.mockResolvedValue({
      id: 'show-1',
      base_ticket_price: 20,
      cinema_complexes: { company_id: 'company-1' },
    } as never);
    seatsRepository.findByIdWithSeatType.mockResolvedValue({
      id: 'seat-1',
      seat_types: { additional_value: 5 },
    } as never);
    ticketsRepository.findTicketTypeById.mockResolvedValue({
      id: 'type-1',
      discount_percentage: 50,
    } as never);

    const result = await service.calculateTicketPrice({
      showtimeId: 'show-1',
      seatId: 'seat-1',
      ticketTypeId: 'type-1',
    });

    expect(result).toEqual({
      face_value: 12.5,
      service_fee: 0,
      total_amount: 12.5,
    });
  });
});
