import { ConflictException, NotFoundException } from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { RabbitMQPublisherService } from 'src/common/rabbitmq/rabbitmq-publisher.service';
import { CreateCinemaComplexDto } from '../dto/create-cinema-complex.dto';
import { UpdateCinemaComplexDto } from '../dto/update-cinema-complex.dto';
import { CinemaComplexesRepository } from '../repositories/cinema-complexes.repository';
import { CinemaComplexesService } from './cinema-complexes.service';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

describe('CinemaComplexesService', () => {
  const repository = {
    findByCode: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findAllByCompany: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
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

  const service = new CinemaComplexesService(repository, rabbitmq, cls);

  beforeEach(() => {
    jest.clearAllMocks();
    cls.getCompanyId.mockReturnValue('company-123');
    cls.getUserId.mockReturnValue('employee-123');
    cls.getRequiredUserId.mockReturnValue('employee-123');
  });

  it('deve criar complexo forçando company_id do contexto autenticado', async () => {
    const dto = {
      company_id: 'empresa-incorreta',
      name: 'Cine Centro',
      code: 'CENTRO-01',
      ibge_municipality_code: '3550308',
    } as CreateCinemaComplexDto;

    const created = {
      id: 'complex-1',
      company_id: 'company-123',
      name: 'Cine Centro',
      code: 'CENTRO-01',
    };

    repository.findByCode.mockResolvedValue(null);
    repository.create.mockResolvedValue(created as any);

    const result = await service.create(dto);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: 'company-123',
      }),
    );
    expect(rabbitmq.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        pattern: 'audit.cinema_complex.created',
        metadata: {
          companyId: 'company-123',
          userId: 'employee-123',
        },
      }),
    );
    expect(result).toEqual(created);
  });

  it('deve lançar conflito ao criar com codigo duplicado', async () => {
    const dto = {
      name: 'Cine Centro',
      code: 'CENTRO-01',
      ibge_municipality_code: '3550308',
    } as CreateCinemaComplexDto;

    repository.findByCode.mockResolvedValue({ id: 'existing' } as any);

    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('deve lançar not found no findOne quando complexo não pertence à empresa', async () => {
    repository.findById.mockResolvedValue({
      id: 'complex-1',
      company_id: 'other-company',
    } as any);

    await expect(service.findOne('complex-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('deve atualizar complexo usando metadados do funcionario autenticado', async () => {
    const dto = { name: 'Novo Nome' } as UpdateCinemaComplexDto;
    const existing = {
      id: 'complex-1',
      company_id: 'company-123',
      code: 'CENTRO-01',
      name: 'Antigo',
    };
    const updated = {
      ...existing,
      ...dto,
    };

    repository.findById.mockResolvedValue(existing as any);
    repository.update.mockResolvedValue(updated as any);

    const result = await service.update('complex-1', dto);

    expect(repository.update).toHaveBeenCalledWith('complex-1', dto);
    expect(rabbitmq.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        pattern: 'audit.cinema_complex.updated',
        metadata: {
          companyId: 'company-123',
          userId: 'employee-123',
        },
      }),
    );
    expect(result).toEqual(updated);
  });
});
