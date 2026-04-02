import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { AccountsPayableRepository } from '../repositories/accounts-payable.repository';
import { AccountsPayableService } from './accounts-payable.service';

describe('AccountsPayableService', () => {
  let service: AccountsPayableService;
  let repository: jest.Mocked<AccountsPayableRepository>;
  let tenantContext: jest.Mocked<TenantContextService>;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
    } as unknown as jest.Mocked<AccountsPayableRepository>;

    tenantContext = {
      getCompanyId: jest.fn(),
    } as unknown as jest.Mocked<TenantContextService>;

    tenantContext.getCompanyId.mockReturnValue('company-1');

    service = new AccountsPayableService(repository, tenantContext);
  });

  it('should create account payable using tenant context company', async () => {
    const dto = {
      issue_date: '2026-03-10',
      due_date: '2026-03-30',
      competence_date: '2026-03-01',
      original_amount: 100,
    };

    repository.create.mockResolvedValue({ id: 'ap-1' } as never);

    const result = await service.create(dto as any);

    expect(repository.create).toHaveBeenCalledWith('company-1', dto);
    expect(result).toEqual({ id: 'ap-1' });
  });

  it('should create for explicit company id', async () => {
    const dto = {
      issue_date: '2026-03-10',
      due_date: '2026-03-30',
      competence_date: '2026-03-01',
      original_amount: 100,
    };
    repository.create.mockResolvedValue({ id: 'ap-2' } as never);

    const result = await service.createForCompany({
      companyId: 'company-2',
      dto: dto as any,
    });

    expect(repository.create).toHaveBeenCalledWith('company-2', dto);
    expect(result).toEqual({ id: 'ap-2' });
  });

  it('should find all by tenant company', async () => {
    const query = { page: 1, per_page: 10 };
    repository.findAll.mockResolvedValue({
      data: [{ id: 'ap-1' }],
      meta: { total: 1, page: 1, per_page: 10, last_page: 1 },
    } as never);

    const result = await service.findAll(query as any);

    expect(repository.findAll).toHaveBeenCalledWith('company-1', query);
    expect(result.data).toHaveLength(1);
  });

  it('should throw NotFoundException when payable does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findOne('ap-404')).rejects.toThrow(NotFoundException);
  });

  it('should return payable details when found', async () => {
    repository.findById.mockResolvedValue({
      id: 'ap-1',
      status: 'pending',
      transactions: [],
    } as never);

    const result = await service.findOne('ap-1');

    expect(repository.findById).toHaveBeenCalledWith('ap-1', 'company-1');
    expect(result).toEqual(expect.objectContaining({ id: 'ap-1' }));
  });

  it('should block update for cancelled accounts', async () => {
    repository.findById.mockResolvedValue({
      id: 'ap-1',
      status: 'cancelled',
      transactions: [],
    } as never);

    await expect(
      service.update('ap-1', { description: 'x' } as any),
    ).rejects.toThrow(BadRequestException);

    expect(repository.update).not.toHaveBeenCalled();
  });

  it('should update pending payable', async () => {
    repository.findById.mockResolvedValue({
      id: 'ap-1',
      status: 'pending',
      transactions: [],
    } as never);
    repository.update.mockResolvedValue({ id: 'ap-1' } as never);

    const result = await service.update('ap-1', {
      description: 'ajuste',
    } as any);

    expect(repository.update).toHaveBeenCalledWith('ap-1', {
      description: 'ajuste',
    });
    expect(result).toEqual({ id: 'ap-1' });
  });
});
