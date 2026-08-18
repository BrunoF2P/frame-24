import { NotFoundException } from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { RabbitMQPublisherService } from 'src/common/rabbitmq/rabbitmq-publisher.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { StorageService } from 'src/modules/storage/storage.service';
import { AudioTypesRepository } from '../../audio-types/repositories/audio-types.repository';
import { CinemaComplexesRepository } from '../../cinema-complexes/repositories/cinema-complexes.repository';
import { ProjectionTypesRepository } from '../../projection-types/repositories/projection-types.repository';
import { SeatTypesRepository } from '../../seat-types/repositories/seat-types.repository';
import { SeatsRepository } from '../../seats/repositories/seats.repository';
import { CreateRoomDto } from '../dto/create-room.dto';
import { RoomsRepository } from '../repositories/rooms.repository';
import { RoomsService } from './rooms.service';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

describe('RoomsService', () => {
  const roomsRepository = {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findById: jest.fn(),
    findByRoomNumber: jest.fn(),
    findAllByComplex: jest.fn(),
  } as unknown as jest.Mocked<RoomsRepository>;

  const seatsRepository = {
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  } as unknown as jest.Mocked<SeatsRepository>;

  const cinemaComplexesRepository = {
    findById: jest.fn(),
  } as unknown as jest.Mocked<CinemaComplexesRepository>;

  const audioTypesRepository = {
    findById: jest.fn(),
  } as unknown as jest.Mocked<AudioTypesRepository>;

  const projectionTypesRepository = {
    findById: jest.fn(),
  } as unknown as jest.Mocked<ProjectionTypesRepository>;

  const seatTypesRepository = {
    findByIds: jest.fn(),
  } as unknown as jest.Mocked<SeatTypesRepository>;

  const snowflake = {
    generate: jest.fn(),
  } as unknown as jest.Mocked<SnowflakeService>;

  const rabbitmq = {
    publish: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<RabbitMQPublisherService>;

  const storageService = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
  } as unknown as jest.Mocked<StorageService>;

  const cls = {
    getCompanyId: jest.fn(),
    getUserId: jest.fn(),
    getRequiredUserId: jest.fn(),
    getCustomerId: jest.fn(),
    getSessionContext: jest.fn(),
  } as unknown as jest.Mocked<TenantContextService>;

  const service = new RoomsService(
    roomsRepository,
    seatsRepository,
    cinemaComplexesRepository,
    audioTypesRepository,
    projectionTypesRepository,
    seatTypesRepository,
    snowflake,
    rabbitmq,
    storageService,
    cls,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    cls.getCompanyId.mockReturnValue('company-123');
    cls.getUserId.mockReturnValue('employee-123');
    cls.getRequiredUserId.mockReturnValue('employee-123');
  });

  it('deve criar sala com metadados do funcionario autenticado', async () => {
    const dto = {
      room_number: '1',
      name: 'Sala 1',
      capacity: 1,
      seat_layout: [
        {
          row_code: 'A',
          seats: [{ seat_type_id: 'seat-type-1', column_number: 1 }],
        },
      ],
    } as CreateRoomDto;

    snowflake.generate
      .mockReturnValueOnce('room-1')
      .mockReturnValueOnce('seat-1');

    cinemaComplexesRepository.findById.mockResolvedValue({
      id: 'complex-1',
      company_id: 'company-123',
    } as any);
    roomsRepository.findByRoomNumber.mockResolvedValue(null);
    seatTypesRepository.findByIds.mockResolvedValue([
      { id: 'seat-type-1' },
    ] as any);
    roomsRepository.create.mockResolvedValue({
      id: 'room-1',
      cinema_complex_id: 'complex-1',
      room_number: '1',
      capacity: 1,
    } as any);

    const result = await service.create('complex-1', dto);

    expect(roomsRepository.create).toHaveBeenCalled();
    expect(seatsRepository.createMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'seat-1',
          room_id: 'room-1',
          seat_type: 'seat-type-1',
        }),
      ]),
    );
    expect(rabbitmq.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        pattern: 'audit.room.created',
        metadata: {
          companyId: 'company-123',
          userId: 'employee-123',
        },
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 'room-1',
      }),
    );
  });

  it('deve bloquear acesso quando complexo nao pertence a empresa', async () => {
    cinemaComplexesRepository.findById.mockResolvedValue({
      id: 'complex-1',
      company_id: 'other-company',
    } as any);

    await expect(service.findAll('complex-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('deve remover sala com metadados do funcionario autenticado', async () => {
    roomsRepository.findById.mockResolvedValue({
      id: 'room-1',
      cinema_complex_id: 'complex-1',
    } as any);
    cinemaComplexesRepository.findById.mockResolvedValue({
      id: 'complex-1',
      company_id: 'company-123',
    } as any);
    roomsRepository.remove.mockResolvedValue({ id: 'room-1' } as any);

    const result = await service.delete('room-1');

    expect(roomsRepository.remove).toHaveBeenCalledWith('room-1');
    expect(rabbitmq.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        pattern: 'audit.room.deleted',
        metadata: {
          companyId: 'company-123',
          userId: 'employee-123',
        },
      }),
    );
    expect(result).toEqual({ message: 'Sala deletada com sucesso.' });
  });
});
