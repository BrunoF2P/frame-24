import { LoggerService } from 'src/common/services/logger.service';
import { SeatStatusRepository } from 'src/modules/operations/seat-status/repositories/seat-status.repository';
import { SessionSeatStatusRepository } from 'src/modules/operations/session_seat_status/repositories/session-seat-status.repository';
import { SeatReservationStoreService } from '../services/seat-reservation-store.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { SeatsReservationGateway } from './seats-reservation.gateway';

jest.mock('jwks-rsa', () => {
  return jest.fn(() => ({
    getSigningKey: jest.fn(),
  }));
});

describe('SeatsReservationGateway', () => {
  let gateway: SeatsReservationGateway;
  let logger: jest.Mocked<LoggerService>;
  let prisma: jest.Mocked<PrismaService>;
  let seatStatusRepository: jest.Mocked<SeatStatusRepository>;
  let seatReservationStore: jest.Mocked<SeatReservationStoreService>;
  let sessionSeatStatusFindMany: jest.Mock;
  let sessionSeatStatusUpdateMany: jest.Mock;
  let showtimeFindUnique: jest.Mock;

  const makeClient = () => {
    return {
      id: 'socket-1',
      handshake: {
        auth: {},
        headers: {},
      },
      data: {},
      join: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
    } as any;
  };

  beforeEach(() => {
    jest.spyOn(global, 'setInterval').mockImplementation(() => 1 as any);

    logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;

    sessionSeatStatusFindMany = jest.fn();
    sessionSeatStatusUpdateMany = jest.fn();
    showtimeFindUnique = jest.fn();

    prisma = {
      $transaction: jest.fn(),
      showtime_schedule: {
        findUnique: showtimeFindUnique,
      },
      session_seat_status: {
        findMany: sessionSeatStatusFindMany,
        updateMany: sessionSeatStatusUpdateMany,
      },
    } as unknown as jest.Mocked<PrismaService>;

    seatStatusRepository = {
      findByNameAndCompany: jest.fn(),
    } as unknown as jest.Mocked<SeatStatusRepository>;

    seatReservationStore = {
      saveReservation: jest.fn(),
      removeReservation: jest.fn(),
      findUserReservation: jest.fn(),
      tryAcquireSeatLocks: jest.fn().mockResolvedValue({ acquired: true }),
      syncSeatLocks: jest.fn(),
      releaseSeatLocks: jest.fn(),
    } as unknown as jest.Mocked<SeatReservationStoreService>;

    gateway = new SeatsReservationGateway(
      logger,
      prisma,
      {} as SessionSeatStatusRepository,
      seatStatusRepository,
      seatReservationStore,
    );

    (gateway as any).server = {
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should load active reservations on module init', async () => {
    sessionSeatStatusFindMany.mockResolvedValue([
      {
        showtime_id: 'show-1',
        seat_id: 'A1',
        reservation_uuid: 'res-1',
        expiration_date: new Date(Date.now() + 60000),
        showtime_schedule: { cinema_complexes: { company_id: 'company-1' } },
      },
      {
        showtime_id: 'show-1',
        seat_id: 'A2',
        reservation_uuid: 'res-1',
        expiration_date: new Date(Date.now() + 60000),
        showtime_schedule: { cinema_complexes: { company_id: 'company-1' } },
      },
    ] as never);

    await gateway.onModuleInit();

    const reservations = (gateway as any).reservations as Map<string, any>;
    expect(reservations.get('res-1').seat_ids).toEqual(['A1', 'A2']);
  });

  it('should authenticate socket connection with token', async () => {
    const client = makeClient();
    client.handshake.auth.token = 'jwt-token';
    const authContext = { sub: 'user-1', company_id: 'company-1' };
    jest
      .spyOn(gateway as any, 'buildSocketUserContext')
      .mockResolvedValue(authContext);

    await gateway.handleConnection(client);

    expect(client.data.user).toEqual(authContext);
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('should disconnect unauthorized socket connection', async () => {
    const client = makeClient();

    await gateway.handleConnection(client);

    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(logger.error).toHaveBeenCalled();
  });

  it('should join showtime and restore reservation when user has one', () => {
    const client = makeClient();
    client.data.user = { sub: 'user-1', company_id: 'company-1' };
    (gateway as any).reservations.set('res-1', {
      showtime_id: 'show-1',
      seat_ids: ['A1', 'A2'],
      expires_at: new Date(Date.now() + 60000),
      socket_id: 'old-socket',
      reservation_uuid: 'res-1',
      user_id: 'user-1',
      company_id: 'company-1',
    });

    gateway.handleJoinShowtime(client, { showtime_id: 'show-1' });

    expect(client.join).toHaveBeenCalledWith('showtime:show-1');
    expect(client.emit).toHaveBeenCalledWith('joined-showtime', {
      showtime_id: 'show-1',
    });
    expect(client.emit).toHaveBeenCalledWith(
      'reservation-restored',
      expect.objectContaining({ reservation_uuid: 'res-1' }),
    );
  });

  it('should emit reservation error when reserved status is missing', async () => {
    const client = makeClient();
    client.data.user = { sub: 'user-1', company_id: 'company-1' };
    showtimeFindUnique.mockResolvedValue({
      id: 'show-1',
      cinema_complexes: { company_id: 'company-1' },
    } as never);
    seatStatusRepository.findByNameAndCompany.mockResolvedValue(null);

    await gateway.handleReserveSeats(client, {
      showtime_id: 'show-1',
      seat_ids: ['A1'],
    });

    expect(client.emit).toHaveBeenCalledWith(
      'reservation-error',
      expect.objectContaining({ message: 'Status de reserva não configurado' }),
    );
  });

  it('should reserve seats successfully and notify room', async () => {
    const client = makeClient();
    client.data.user = { sub: 'user-1', company_id: 'company-1' };
    const roomEmit = jest.fn();
    (gateway as any).server = {
      to: jest.fn().mockReturnValue({ emit: roomEmit }),
    };

    showtimeFindUnique.mockResolvedValue({
      id: 'show-1',
      cinema_complexes: { company_id: 'company-1' },
    } as never);
    seatStatusRepository.findByNameAndCompany.mockResolvedValue({
      id: 'reserved-status',
    } as never);
    prisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        session_seat_status: {
          findFirst: jest.fn().mockResolvedValue(null),
          updateMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
      };
      await cb(tx);
    });

    await gateway.handleReserveSeats(client, {
      showtime_id: 'show-1',
      seat_ids: ['A1', 'A2'],
    });

    expect(client.emit).toHaveBeenCalledWith(
      'reservation-success',
      expect.objectContaining({ seat_ids: ['A1', 'A2'] }),
    );
    expect(seatReservationStore.tryAcquireSeatLocks).toHaveBeenCalled();
    expect(roomEmit).toHaveBeenCalledWith(
      'seats-reserved',
      expect.objectContaining({ seat_ids: ['A1', 'A2'] }),
    );
  });

  it('should emit reservation error when seat is unavailable in transaction', async () => {
    const client = makeClient();
    client.data.user = { sub: 'user-1', company_id: 'company-1' };
    showtimeFindUnique.mockResolvedValue({
      id: 'show-1',
      cinema_complexes: { company_id: 'company-1' },
    } as never);
    seatStatusRepository.findByNameAndCompany.mockResolvedValue({
      id: 'reserved-status',
    } as never);
    prisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        session_seat_status: {
          findFirst: jest.fn().mockResolvedValue({ seat_id: 'A1' }),
          updateMany: jest.fn(),
        },
      };
      await cb(tx);
    });

    await gateway.handleReserveSeats(client, {
      showtime_id: 'show-1',
      seat_ids: ['A1'],
    });

    expect(client.emit).toHaveBeenCalledWith(
      'reservation-error',
      expect.objectContaining({
        message: expect.stringContaining('não está disponível'),
      }),
    );
    expect(seatReservationStore.releaseSeatLocks).toHaveBeenCalled();
  });

  it('should emit reservation error when update count differs from requested seats', async () => {
    const client = makeClient();
    client.data.user = { sub: 'user-1', company_id: 'company-1' };
    showtimeFindUnique.mockResolvedValue({
      id: 'show-1',
      cinema_complexes: { company_id: 'company-1' },
    } as never);
    seatStatusRepository.findByNameAndCompany.mockResolvedValue({
      id: 'reserved-status',
    } as never);
    prisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        session_seat_status: {
          findFirst: jest.fn().mockResolvedValue(null),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      };
      await cb(tx);
    });

    await gateway.handleReserveSeats(client, {
      showtime_id: 'show-1',
      seat_ids: ['A1', 'A2'],
    });

    expect(client.emit).toHaveBeenCalledWith(
      'reservation-error',
      expect.objectContaining({
        message: expect.stringContaining('Não foi possível reservar todos'),
      }),
    );
    expect(seatReservationStore.releaseSeatLocks).toHaveBeenCalled();
  });

  it('should emit reservation error when redis lock acquisition fails', async () => {
    const client = makeClient();
    client.data.user = { sub: 'user-1', company_id: 'company-1' };
    showtimeFindUnique.mockResolvedValue({
      id: 'show-1',
      cinema_complexes: { company_id: 'company-1' },
    } as never);
    seatStatusRepository.findByNameAndCompany.mockResolvedValue({
      id: 'reserved-status',
    } as never);
    seatReservationStore.tryAcquireSeatLocks.mockResolvedValue({
      acquired: false,
      conflictingSeatIds: ['A1'],
    } as never);

    await gateway.handleReserveSeats(client, {
      showtime_id: 'show-1',
      seat_ids: ['A1'],
    });

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(client.emit).toHaveBeenCalledWith(
      'reservation-error',
      expect.objectContaining({
        message: expect.stringContaining('A1'),
      }),
    );
  });

  it('should emit confirmation error when reservation does not exist', async () => {
    const client = makeClient();
    client.data.user = { sub: 'user-1', company_id: 'company-1' };

    await gateway.handleConfirmReservation(client, {
      reservation_uuid: 'missing',
      sale_id: 'sale-1',
    });

    expect(client.emit).toHaveBeenCalledWith(
      'confirmation-error',
      expect.objectContaining({ message: 'Reserva não encontrada' }),
    );
  });

  it('should confirm reservation and clear it from memory', async () => {
    const client = makeClient();
    client.data.user = { sub: 'user-1', company_id: 'company-1' };
    const roomEmit = jest.fn();
    (gateway as any).server = {
      to: jest.fn().mockReturnValue({ emit: roomEmit }),
    };

    (gateway as any).reservations.set('res-1', {
      showtime_id: 'show-1',
      seat_ids: ['A1', 'A2'],
      expires_at: new Date(Date.now() + 60000),
      socket_id: 'socket-1',
      reservation_uuid: 'res-1',
      user_id: 'user-1',
      company_id: 'company-1',
    });
    sessionSeatStatusUpdateMany.mockResolvedValue({ count: 2 } as never);

    await gateway.handleConfirmReservation(client, {
      reservation_uuid: 'res-1',
      sale_id: 'sale-1',
    });

    expect(sessionSeatStatusUpdateMany).toHaveBeenCalled();
    expect(roomEmit).toHaveBeenCalledWith(
      'seats-confirmed',
      expect.objectContaining({ seat_ids: ['A1', 'A2'], sale_id: 'sale-1' }),
    );
    expect((gateway as any).reservations.has('res-1')).toBe(false);
    expect(seatReservationStore.releaseSeatLocks).toHaveBeenCalledWith(
      'show-1',
      ['A1', 'A2'],
      'res-1',
    );
  });

  it('should emit confirmation error when update fails', async () => {
    const client = makeClient();
    client.data.user = { sub: 'user-1', company_id: 'company-1' };
    (gateway as any).reservations.set('res-1', {
      showtime_id: 'show-1',
      seat_ids: ['A1'],
      expires_at: new Date(Date.now() + 60000),
      socket_id: 'socket-1',
      reservation_uuid: 'res-1',
      company_id: 'company-1',
    });
    sessionSeatStatusUpdateMany.mockRejectedValue(new Error('db error'));

    await gateway.handleConfirmReservation(client, {
      reservation_uuid: 'res-1',
      sale_id: 'sale-1',
    });

    expect(client.emit).toHaveBeenCalledWith(
      'confirmation-error',
      expect.objectContaining({ message: 'Erro ao confirmar reserva' }),
    );
  });

  it('should release seats by reservation uuid and emit result to client', async () => {
    const client = makeClient();
    client.data.user = { sub: 'user-1', company_id: 'company-1' };
    (gateway as any).reservations.set('res-1', {
      showtime_id: 'show-1',
      seat_ids: ['A1'],
      expires_at: new Date(Date.now() + 60000),
      socket_id: 'socket-1',
      reservation_uuid: 'res-1',
      user_id: 'user-1',
      company_id: 'company-1',
    });

    const expireSpy = jest
      .spyOn(gateway as any, 'expireReservation')
      .mockResolvedValue(undefined);

    await gateway.handleReleaseSeats(client, {
      reservation_uuid: 'res-1',
    });

    expect(expireSpy).toHaveBeenCalledWith('res-1', 'company-1');
    expect(client.emit).toHaveBeenCalledWith('seats-released', {
      reservation_uuid: 'res-1',
    });
  });

  it('should block release when reservation belongs to another user', async () => {
    const client = makeClient();
    client.data.user = { sub: 'user-2', company_id: 'company-1' };
    (gateway as any).reservations.set('res-1', {
      showtime_id: 'show-1',
      seat_ids: ['A1'],
      expires_at: new Date(Date.now() + 60000),
      socket_id: 'socket-1',
      reservation_uuid: 'res-1',
      user_id: 'user-1',
      company_id: 'company-1',
    });

    await gateway.handleReleaseSeats(client, {
      reservation_uuid: 'res-1',
    });

    expect(client.emit).toHaveBeenCalledWith(
      'reservation-error',
      expect.objectContaining({ message: 'Reserva pertence a outro usuário' }),
    );
  });

  it('should expire reservation from memory and notify clients', async () => {
    const roomEmit = jest.fn();
    (gateway as any).server = {
      to: jest.fn().mockReturnValue({ emit: roomEmit }),
    };

    (gateway as any).reservations.set('res-1', {
      showtime_id: 'show-1',
      seat_ids: ['A1'],
      expires_at: new Date(Date.now() + 60000),
      socket_id: 'socket-1',
      reservation_uuid: 'res-1',
      user_id: 'user-1',
      company_id: 'company-1',
    });

    seatStatusRepository.findByNameAndCompany.mockResolvedValue({
      id: 'available-status',
    } as never);
    sessionSeatStatusUpdateMany.mockResolvedValue({ count: 1 } as never);

    await (gateway as any).expireReservation('res-1');

    expect(sessionSeatStatusUpdateMany).toHaveBeenCalled();
    expect(roomEmit).toHaveBeenCalledWith(
      'seats-released',
      expect.objectContaining({ seat_ids: ['A1'], reservation_uuid: 'res-1' }),
    );
    expect((gateway as any).reservations.has('res-1')).toBe(false);
    expect(seatReservationStore.releaseSeatLocks).toHaveBeenCalledWith(
      'show-1',
      ['A1'],
      'res-1',
    );
  });

  it('should skip expiration when company cannot be determined', async () => {
    sessionSeatStatusFindMany.mockResolvedValue([] as never);

    await (gateway as any).expireReservation('res-unknown');

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Could not determine company_id'),
      'SeatsReservationGateway',
    );
  });

  it('should warn and stop expiration when available status is missing', async () => {
    sessionSeatStatusFindMany.mockResolvedValue([
      {
        showtime_schedule: { cinema_complexes: { company_id: 'company-1' } },
      },
    ] as never);
    seatStatusRepository.findByNameAndCompany.mockResolvedValue(null);

    await (gateway as any).expireReservation('res-unknown');

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Available status not found'),
      'SeatsReservationGateway',
    );
  });

  it('should expire reservation using database fallback when not in memory', async () => {
    const roomEmit = jest.fn();
    (gateway as any).server = {
      to: jest.fn().mockReturnValue({ emit: roomEmit }),
    };
    sessionSeatStatusFindMany
      .mockResolvedValueOnce([
        {
          showtime_schedule: { cinema_complexes: { company_id: 'company-1' } },
        },
      ] as never)
      .mockResolvedValueOnce([
        { showtime_id: 'show-1', seat_id: 'A1' },
      ] as never);
    seatStatusRepository.findByNameAndCompany.mockResolvedValue({
      id: 'available-status',
    } as never);
    sessionSeatStatusUpdateMany.mockResolvedValue({ count: 1 } as never);

    await (gateway as any).expireReservation('res-fallback');

    expect(sessionSeatStatusUpdateMany).toHaveBeenCalled();
    expect(roomEmit).toHaveBeenCalledWith(
      'seats-released',
      expect.objectContaining({
        seat_ids: ['A1'],
        reservation_uuid: 'res-fallback',
      }),
    );
  });

  it('should clean expired reservations in memory and keep active ones', async () => {
    const roomEmit = jest.fn();
    (gateway as any).server = {
      to: jest.fn().mockReturnValue({ emit: roomEmit }),
    };
    (gateway as any).reservations.set('expired-1', {
      showtime_id: 'show-1',
      seat_ids: ['A1'],
      expires_at: new Date(Date.now() - 1000),
      socket_id: 'socket-1',
      reservation_uuid: 'expired-1',
      company_id: 'company-1',
    });
    (gateway as any).reservations.set('active-1', {
      showtime_id: 'show-1',
      seat_ids: ['A2'],
      expires_at: new Date(Date.now() + 100000),
      socket_id: 'socket-1',
      reservation_uuid: 'active-1',
      company_id: 'company-1',
    });

    sessionSeatStatusFindMany.mockResolvedValue([
      {
        showtime_id: 'show-1',
        seat_id: 'A1',
        reservation_uuid: 'expired-1',
        showtime_schedule: { cinema_complexes: { company_id: 'company-1' } },
      },
    ] as never);
    seatStatusRepository.findByNameAndCompany.mockResolvedValue({
      id: 'available-status',
    } as never);
    sessionSeatStatusUpdateMany.mockResolvedValue({ count: 1 } as never);

    await (gateway as any).cleanExpiredReservations();

    expect((gateway as any).reservations.has('expired-1')).toBe(false);
    expect((gateway as any).reservations.has('active-1')).toBe(true);
    expect(roomEmit).toHaveBeenCalledWith(
      'seats-released',
      expect.objectContaining({ reservation_uuid: 'expired-1' }),
    );
  });
});
