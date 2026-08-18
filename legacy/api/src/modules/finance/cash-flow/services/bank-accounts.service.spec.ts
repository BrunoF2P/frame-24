import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { BankAccountsRepository } from '../repositories/bank-accounts.repository';
import { BankAccountsService } from './bank-accounts.service';

describe('BankAccountsService', () => {
  let service: BankAccountsService;
  let repository: jest.Mocked<BankAccountsRepository>;
  let snowflake: jest.Mocked<SnowflakeService>;
  let tenantContext: jest.Mocked<TenantContextService>;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      updateBalance: jest.fn(),
      getBalance: jest.fn(),
    } as unknown as jest.Mocked<BankAccountsRepository>;

    snowflake = {
      generate: jest.fn(),
    } as unknown as jest.Mocked<SnowflakeService>;

    tenantContext = {
      getCompanyId: jest.fn(),
    } as unknown as jest.Mocked<TenantContextService>;

    tenantContext.getCompanyId.mockReturnValue('company-1');
    snowflake.generate.mockReturnValue('bank-1');

    service = new BankAccountsService(repository, snowflake, tenantContext);
  });

  it('should create bank account with initial and current balances', async () => {
    repository.create.mockResolvedValue({ id: 'bank-1' } as never);

    const dto = {
      bank_name: 'Banco X',
      agency: '0001',
      account_number: '12345',
      account_type: 'checking',
      initial_balance: 500,
    };

    const result = await service.create(dto as any);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'bank-1',
        company_id: 'company-1',
        initial_balance: 500,
        current_balance: 500,
        active: true,
      }),
    );
    expect(result).toEqual({ id: 'bank-1' });
  });

  it('should throw NotFoundException on findOne for unknown account', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findOne('bank-404')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should update account and return refreshed entity', async () => {
    repository.findById
      .mockResolvedValueOnce({ id: 'bank-1', active: true } as never)
      .mockResolvedValueOnce({ id: 'bank-1', bank_name: 'Banco Y' } as never);
    repository.update.mockResolvedValue({ count: 1 } as never);

    const result = await service.update('bank-1', {
      bank_name: 'Banco Y',
      description: 'principal',
    } as any);

    expect(repository.update).toHaveBeenCalledWith(
      'bank-1',
      'company-1',
      expect.objectContaining({
        bank_name: 'Banco Y',
        description: 'principal',
      }),
    );
    expect(result).toEqual({ id: 'bank-1', bank_name: 'Banco Y' });
  });

  it('should throw when update has no affected rows', async () => {
    repository.findById.mockResolvedValue({
      id: 'bank-1',
      active: true,
    } as never);
    repository.update.mockResolvedValue({ count: 0 } as never);

    await expect(
      service.update('bank-1', { bank_name: 'Novo' } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('should return current account balance payload', async () => {
    repository.findById.mockResolvedValue({ id: 'bank-1' } as never);
    repository.getBalance.mockResolvedValue(123.45 as never);

    const result = await service.getBalance('bank-1');

    expect(result).toEqual({
      bank_account_id: 'bank-1',
      current_balance: 123.45,
    });
  });

  it('should soft delete account by setting active false', async () => {
    repository.findById.mockResolvedValue({
      id: 'bank-1',
      active: true,
    } as never);
    repository.update.mockResolvedValue({ count: 1 } as never);

    const result = await service.delete('bank-1');

    expect(repository.update).toHaveBeenCalledWith('bank-1', 'company-1', {
      active: false,
    });
    expect(result).toEqual({ count: 1 });
  });
});
