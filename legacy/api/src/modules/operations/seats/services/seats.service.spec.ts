import { ForbiddenException } from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { RabbitMQPublisherService } from 'src/common/rabbitmq/rabbitmq-publisher.service';
import { CinemaComplexesRepository } from '../../cinema-complexes/repositories/cinema-complexes.repository';
import { RoomsRepository } from '../../rooms/repositories/rooms.repository';
import { UpdateSeatsStatusBatchDto } from '../dto/update-seats-status-batch.dto';
import { SeatsRepository } from '../repositories/seats.repository';
import { SeatsService } from './seats.service';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

describe('SeatsService', () => {
  const seatsRepository = {
    findById: jest.fn(),
    update: jest.fn(),
    findManyWithOwnership: jest.fn(),
    updateMany: jest.fn(),
  } as unknown as jest.Mocked<SeatsRepository>;

  const roomsRepository = {
    findById: jest.fn(),
  } as unknown as jest.Mocked<RoomsRepository>;

  const cinemaComplexesRepository = {
    findById: jest.fn(),
  } as unknown as jest.Mocked<CinemaComplexesRepository>;

  const rabbitmq = {
    publish: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<RabbitMQPublisherService>;

  const cls = {
    getCompanyId: jest.fn(),
    getUserId: jest.fn(),
    getRequiredUserId: jest.fn(),
    getCustomerId: jest.fn(),
    getSessionContext: jest.fn(),
  } as unknown as jest.Mocked<TenantContextService>;

  const service = new SeatsService(
    seatsRepository,
    roomsRepository,
    cinemaComplexesRepository,
    rabbitmq,
    cls,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    cls.getCompanyId.mockReturnValue('company-123');
    cls.getUserId.mockReturnValue('employee-123');
    cls.getRequiredUserId.mockReturnValue('employee-123');
  });

  it('deve atualizar um assento com metadados do funcionario autenticado', async () => {
    seatsRepository.findById.mockResolvedValue({
      id: 'seat-1',
      room_id: 'room-1',
      active: true,
    } as any);
    roomsRepository.findById.mockResolvedValue({
      id: 'room-1',
      cinema_complex_id: 'complex-1',
    } as any);
    cinemaComplexesRepository.findById.mockResolvedValue({
      id: 'complex-1',
      company_id: 'company-123',
    } as any);
    seatsRepository.update.mockResolvedValue({
      id: 'seat-1',
      active: false,
    } as any);

    const result = await service.updateStatus('seat-1', false);

    expect(seatsRepository.update).toHaveBeenCalledWith('seat-1', {
      active: false,
    });
    expect(rabbitmq.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        pattern: 'audit.seat.updated',
        metadata: {
          companyId: 'company-123',
          userId: 'employee-123',
        },
      }),
    );
    expect(result).toEqual(expect.objectContaining({ id: 'seat-1' }));
  });

  it('deve atualizar assentos em lote e retornar total atualizado', async () => {
    const dto = {
      seats: [
        { seat_id: 'seat-1', active: true },
        { seat_id: 'seat-2', active: false },
      ],
    } as UpdateSeatsStatusBatchDto;

    seatsRepository.findManyWithOwnership.mockResolvedValue([
      { id: 'seat-1' },
      { id: 'seat-2' },
    ] as any);
    seatsRepository.updateMany
      .mockResolvedValueOnce({ count: 1 } as any)
      .mockResolvedValueOnce({ count: 1 } as any);

    const result = await service.updateStatusBatch(dto);

    expect(seatsRepository.updateMany).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ updated: 2 });
    expect(rabbitmq.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        pattern: 'audit.seat.batch_updated',
        metadata: {
          companyId: 'company-123',
          userId: 'employee-123',
        },
      }),
    );
  });

  it('deve negar lote com assento fora da empresa', async () => {
    const dto = {
      seats: [
        { seat_id: 'seat-1', active: true },
        { seat_id: 'seat-2', active: false },
      ],
    } as UpdateSeatsStatusBatchDto;

    seatsRepository.findManyWithOwnership.mockResolvedValue([
      { id: 'seat-1' },
    ] as any);

    await expect(service.updateStatusBatch(dto)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
