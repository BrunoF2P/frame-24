import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { BankAccountsRepository } from '../repositories/bank-accounts.repository';
import { CashFlowEntriesRepository } from '../repositories/cash-flow-entries.repository';
import { CashFlowEntriesService } from './cash-flow-entries.service';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _key: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

describe('CashFlowEntriesService', () => {
  let service: CashFlowEntriesService;
  let repository: jest.Mocked<CashFlowEntriesRepository>;
  let bankAccountsRepository: jest.Mocked<BankAccountsRepository>;
  let snowflake: jest.Mocked<SnowflakeService>;
  let tenantContext: jest.Mocked<TenantContextService>;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      delete: jest.fn(),
      reconcile: jest.fn(),
      calculateBalance: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<CashFlowEntriesRepository>;

    bankAccountsRepository = {
      findById: jest.fn(),
      updateBalance: jest.fn(),
    } as unknown as jest.Mocked<BankAccountsRepository>;

    snowflake = {
      generate: jest.fn(),
    } as unknown as jest.Mocked<SnowflakeService>;

    tenantContext = {
      getCompanyId: jest.fn(),
      getRequiredUserId: jest.fn(),
    } as unknown as jest.Mocked<TenantContextService>;

    tenantContext.getCompanyId.mockReturnValue('company-1');
    tenantContext.getRequiredUserId.mockReturnValue('user-1');
    snowflake.generate.mockReturnValue('cfe-1');

    service = new CashFlowEntriesService(
      repository,
      bankAccountsRepository,
      snowflake,
      tenantContext,
    );
  });

  it('should throw when bank account is not found', async () => {
    bankAccountsRepository.findById.mockResolvedValue(null);

    await expect(
      service.create({
        bank_account_id: 'bank-404',
        entry_type: 'receipt',
        category: 'ticket_sale',
        amount: 100,
        entry_date: '2026-03-20',
      } as any),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw when bank account is inactive', async () => {
    bankAccountsRepository.findById.mockResolvedValue({
      id: 'bank-1',
      active: false,
    } as never);

    await expect(
      service.create({
        bank_account_id: 'bank-1',
        entry_type: 'receipt',
        category: 'ticket_sale',
        amount: 100,
        entry_date: '2026-03-20',
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('should create confirmed entry and update bank balance', async () => {
    bankAccountsRepository.findById
      .mockResolvedValueOnce({
        id: 'bank-1',
        active: true,
        initial_balance: 100,
      } as never)
      .mockResolvedValueOnce({
        id: 'bank-1',
        active: true,
        initial_balance: 100,
      } as never);

    repository.create.mockResolvedValue({ id: 'cfe-1' } as never);
    repository.calculateBalance.mockResolvedValue({
      total_receipts: 80,
      total_payments: 20,
      net_balance: 60,
    });
    bankAccountsRepository.updateBalance.mockResolvedValue({
      id: 'bank-1',
    } as never);

    const result = await service.create({
      bank_account_id: 'bank-1',
      entry_type: 'receipt',
      category: 'ticket_sale',
      amount: 60,
      entry_date: '2026-03-20',
      status: 'confirmed',
    } as any);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'cfe-1',
        company_id: 'company-1',
        created_by: 'user-1',
      }),
    );
    expect(bankAccountsRepository.updateBalance).toHaveBeenCalledWith(
      'bank-1',
      160,
    );
    expect(result).toEqual({ id: 'cfe-1' });
  });

  it('should block delete when entry is reconciled', async () => {
    repository.findById.mockResolvedValue({
      id: 'cfe-1',
      reconciled: true,
    } as never);

    await expect(service.delete('cfe-1')).rejects.toThrow(BadRequestException);
  });

  it('should reconcile non-reconciled entry and update balance', async () => {
    repository.findById.mockResolvedValue({
      id: 'cfe-1',
      bank_account_id: 'bank-1',
      reconciled: false,
    } as never);
    repository.reconcile.mockResolvedValue({ count: 1 } as never);
    bankAccountsRepository.findById.mockResolvedValue({
      id: 'bank-1',
      initial_balance: 50,
      active: true,
    } as never);
    repository.calculateBalance.mockResolvedValue({
      total_receipts: 100,
      total_payments: 20,
      net_balance: 80,
    });

    const result = await service.reconcile('cfe-1');

    expect(repository.reconcile).toHaveBeenCalledWith('cfe-1', 'company-1');
    expect(bankAccountsRepository.updateBalance).toHaveBeenCalledWith(
      'bank-1',
      130,
    );
    expect(result).toEqual({ message: 'Entry reconciled successfully' });
  });

  it('should map findAll response metadata', async () => {
    repository.findAll.mockResolvedValue([
      { id: 'cfe-1' },
      { id: 'cfe-2' },
    ] as never);

    const result = await service.findAll({ skip: 5, take: 10 } as any);

    expect(result).toEqual({
      entries: [{ id: 'cfe-1' }, { id: 'cfe-2' }],
      total: 2,
      skip: 5,
      take: 10,
    });
  });
});
