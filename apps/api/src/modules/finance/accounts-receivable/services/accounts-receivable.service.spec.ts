import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { AccountsReceivableRepository } from '../repositories/accounts-receivable.repository';
import { AccountsReceivableService } from './accounts-receivable.service';

describe('AccountsReceivableService', () => {
  let service: AccountsReceivableService;
  let repository: jest.Mocked<AccountsReceivableRepository>;
  let tenantContext: jest.Mocked<TenantContextService>;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
    } as unknown as jest.Mocked<AccountsReceivableRepository>;

    tenantContext = {
      getCompanyId: jest.fn(),
    } as unknown as jest.Mocked<TenantContextService>;

    tenantContext.getCompanyId.mockReturnValue('company-1');

    service = new AccountsReceivableService(repository, tenantContext);
  });

  it('should create account receivable using company from tenant context', async () => {
    const dto = {
      cinema_complex_id: 'complex-1',
      issue_date: '2026-03-10',
      due_date: '2026-03-30',
      competence_date: '2026-03-01',
      original_amount: 100,
    };

    repository.create.mockResolvedValue({ id: 'ar-1' } as never);

    const result = await service.create(dto as any);

    expect(repository.create).toHaveBeenCalledWith('company-1', dto);
    expect(result).toEqual({ id: 'ar-1' });
  });

  it('should create for explicit company in createForCompany', async () => {
    const dto = {
      issue_date: '2026-03-10',
      due_date: '2026-03-30',
      competence_date: '2026-03-01',
      original_amount: 100,
    };

    repository.create.mockResolvedValue({ id: 'ar-2' } as never);

    const result = await service.createForCompany({
      companyId: 'company-2',
      dto: dto as any,
    });

    expect(repository.create).toHaveBeenCalledWith('company-2', dto);
    expect(result).toEqual({ id: 'ar-2' });
  });

  it('should delegate findAll with tenant company context', async () => {
    const query = { page: 1, per_page: 20 };
    repository.findAll.mockResolvedValue({
      data: [{ id: 'ar-1' }],
      meta: { total: 1, page: 1, per_page: 20, last_page: 1 },
    } as never);

    const result = await service.findAll(query as any);

    expect(repository.findAll).toHaveBeenCalledWith('company-1', query);
    expect(result.data).toHaveLength(1);
  });

  it('should throw NotFoundException when account does not exist for company', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findOne('ar-404')).rejects.toThrow(NotFoundException);
  });

  it('should return account with transactions in findOne', async () => {
    repository.findById.mockResolvedValue({
      id: 'ar-1',
      status: 'pending',
      transactions: [],
    } as never);

    const result = await service.findOne('ar-1');

    expect(repository.findById).toHaveBeenCalledWith('ar-1', 'company-1');
    expect(result).toEqual(
      expect.objectContaining({
        id: 'ar-1',
      }),
    );
  });

  it('should block update for paid accounts', async () => {
    repository.findById.mockResolvedValue({
      id: 'ar-1',
      status: 'paid',
      transactions: [],
    } as never);

    await expect(
      service.update('ar-1', { description: 'novo' } as any),
    ).rejects.toThrow(BadRequestException);

    expect(repository.update).not.toHaveBeenCalled();
  });

  it('should update pending accounts', async () => {
    repository.findById.mockResolvedValue({
      id: 'ar-1',
      status: 'pending',
      transactions: [],
    } as never);
    repository.update.mockResolvedValue({ id: 'ar-1' } as never);

    const result = await service.update('ar-1', {
      description: 'ajuste',
    } as any);

    expect(repository.update).toHaveBeenCalledWith('ar-1', {
      description: 'ajuste',
    });
    expect(result).toEqual({ id: 'ar-1' });
  });
});
