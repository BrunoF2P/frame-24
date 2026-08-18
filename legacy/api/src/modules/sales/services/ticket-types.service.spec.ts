import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import { LoggerService } from 'src/common/services/logger.service';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { CreateTicketTypeDto } from '../dto/create-ticket-type.dto';
import { TicketTypesRepository } from '../repositories/ticket-types.repository';
import { TicketTypesService } from './ticket-types.service';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

describe('TicketTypesService', () => {
  const repository = {
    findById: jest.fn(),
    findByName: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    countTickets: jest.fn(),
  } as unknown as jest.Mocked<TicketTypesRepository>;

  const logger = {
    log: jest.fn(),
  } as unknown as jest.Mocked<LoggerService>;

  const tenantContext = {
    getCompanyId: jest.fn(),
    getUserId: jest.fn(),
    getRequiredUserId: jest.fn(),
    getCustomerId: jest.fn(),
    getSessionContext: jest.fn(),
    getIdentityId: jest.fn(),
    getRoleHierarchy: jest.fn(),
  } as unknown as jest.Mocked<TenantContextService>;

  const service = new TicketTypesService(repository, logger, tenantContext);

  beforeEach(() => {
    jest.clearAllMocks();
    tenantContext.getCompanyId.mockReturnValue('company-123');
  });

  it('deve criar tipo de ingresso usando company_id do contexto', async () => {
    const dto = {
      name: 'Meia-entrada',
      description: '50% de desconto',
      discount_percentage: 50,
    } as CreateTicketTypeDto;

    repository.findByName.mockResolvedValue(null);
    repository.create.mockResolvedValue({
      id: 'type-1',
      company_id: 'company-123',
      name: 'Meia-entrada',
      description: '50% de desconto',
      discount_percentage: new Prisma.Decimal(50),
    } as any);

    const result = await service.create(dto);

    expect(repository.findByName).toHaveBeenCalledWith(
      'company-123',
      'Meia-entrada',
    );
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: 'company-123',
        name: 'Meia-entrada',
      }),
    );
    expect(result.discount_percentage).toBe(50);
    expect(result.price_modifier).toBe(0.5);
  });

  it('deve listar tipos de ingresso da empresa do contexto', async () => {
    repository.findAll.mockResolvedValue([
      {
        id: 'type-1',
        company_id: 'company-123',
        name: 'Inteira',
        description: null,
        discount_percentage: new Prisma.Decimal(0),
      },
    ] as any);

    const result = await service.findAll();

    expect(repository.findAll).toHaveBeenCalledWith('company-123');
    expect(result).toEqual([
      expect.objectContaining({
        id: 'type-1',
        name: 'Inteira',
        discount_percentage: 0,
        price_modifier: 1,
      }),
    ]);
  });

  it('deve bloquear exclusão quando o tipo já está em uso', async () => {
    repository.findById.mockResolvedValue({
      id: 'type-1',
      company_id: 'company-123',
      name: 'Inteira',
      description: null,
      discount_percentage: new Prisma.Decimal(0),
    } as any);
    repository.countTickets.mockResolvedValue(2);

    await expect(service.delete('type-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('deve lançar not found para tipo de ingresso de outra empresa', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findOne('type-404')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('deve lançar conflito ao renomear para um nome já existente', async () => {
    repository.findById.mockResolvedValue({
      id: 'type-1',
      company_id: 'company-123',
      name: 'Inteira',
      description: null,
      discount_percentage: new Prisma.Decimal(0),
    } as any);
    repository.findByName.mockResolvedValue({
      id: 'type-2',
      company_id: 'company-123',
      name: 'VIP',
      description: null,
      discount_percentage: new Prisma.Decimal(20),
    } as any);

    await expect(
      service.update('type-1', { name: 'VIP' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('deve lançar erro quando company_id não existe no contexto', async () => {
    tenantContext.getCompanyId.mockImplementation(() => {
      throw new ForbiddenException('Contexto da empresa não encontrado.');
    });

    await expect(service.findAll()).rejects.toBeInstanceOf(ForbiddenException);
  });
});
