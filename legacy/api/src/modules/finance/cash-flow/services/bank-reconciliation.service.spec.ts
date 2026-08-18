import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { BankAccountsRepository } from '../repositories/bank-accounts.repository';
import { BankReconciliationRepository } from '../repositories/bank-reconciliation.repository';
import { BankReconciliationService } from './bank-reconciliation.service';

describe('BankReconciliationService', () => {
  let service: BankReconciliationService;
  let repository: jest.Mocked<BankReconciliationRepository>;
  let bankAccountsRepository: jest.Mocked<BankAccountsRepository>;
  let snowflake: jest.Mocked<SnowflakeService>;
  let tenantContext: jest.Mocked<TenantContextService>;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      findByMonth: jest.fn(),
      update: jest.fn(),
      getMonthlyTotals: jest.fn(),
    } as unknown as jest.Mocked<BankReconciliationRepository>;

    bankAccountsRepository = {
      findById: jest.fn(),
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
    snowflake.generate.mockReturnValue('recon-1');

    service = new BankReconciliationService(
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
        reference_month: '2026-03-01',
        opening_balance: 100,
        closing_balance: 150,
        bank_statement_balance: 150,
      } as any),
    ).rejects.toThrow(NotFoundException);
  });

  it('should block duplicate reconciliation for same month/account', async () => {
    bankAccountsRepository.findById.mockResolvedValue({
      id: 'bank-1',
    } as never);
    repository.findByMonth.mockResolvedValue({ id: 'existing' } as never);

    await expect(
      service.create({
        bank_account_id: 'bank-1',
        reference_month: '2026-03-01',
        opening_balance: 100,
        closing_balance: 150,
        bank_statement_balance: 150,
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('should create reconciliation with calculated balances and difference', async () => {
    bankAccountsRepository.findById.mockResolvedValue({
      id: 'bank-1',
    } as never);
    repository.findByMonth.mockResolvedValue(null);
    repository.getMonthlyTotals.mockResolvedValue({
      total_receipts: 300,
      total_payments: 100,
      pending_receipts: 50,
      pending_payments: 20,
    });
    repository.create.mockResolvedValue({ id: 'recon-1' } as never);

    const result = await service.create({
      bank_account_id: 'bank-1',
      reference_month: '2026-03-01',
      opening_balance: 200,
      closing_balance: 380,
      bank_statement_balance: 410,
      notes: 'marco',
    } as any);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'recon-1',
        opening_balance: 200,
        total_receipts: 300,
        total_payments: 100,
        reconciled_balance: 400,
        difference: 10,
        status: 'pending',
      }),
    );
    expect(result).toEqual({ id: 'recon-1' });
  });

  it('should block update when reconciliation is completed', async () => {
    repository.findById.mockResolvedValue({
      id: 'recon-1',
      status: 'completed',
    } as never);

    await expect(
      service.update('recon-1', { notes: 'x' } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('should update bank_statement_balance and recalculate difference', async () => {
    repository.findById.mockResolvedValue({
      id: 'recon-1',
      status: 'pending',
      difference: 5,
      reconciled_balance: 400,
    } as never);
    repository.update.mockResolvedValue({ id: 'recon-1' } as never);

    const result = await service.update('recon-1', {
      bank_statement_balance: 395,
    } as any);

    expect(repository.update).toHaveBeenCalledWith(
      'recon-1',
      expect.objectContaining({
        bank_statement_balance: 395,
        difference: -5,
      }),
    );
    expect(result).toEqual({ id: 'recon-1' });
  });

  it('should block completion when there is unresolved difference', async () => {
    repository.findById.mockResolvedValue({
      id: 'recon-1',
      difference: 1,
      status: 'pending',
    } as never);

    await expect(service.complete('recon-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should complete reconciliation when difference is zero', async () => {
    repository.findById.mockResolvedValue({
      id: 'recon-1',
      difference: 0,
      status: 'pending',
    } as never);
    repository.update.mockResolvedValue({
      id: 'recon-1',
      status: 'completed',
    } as never);

    const result = await service.complete('recon-1');

    expect(repository.update).toHaveBeenCalledWith(
      'recon-1',
      expect.objectContaining({ status: 'completed' }),
    );
    expect(result).toEqual({ id: 'recon-1', status: 'completed' });
  });
});
