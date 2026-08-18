import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ChartOfAccountsService } from './chart-of-accounts.service';

describe('ChartOfAccountsService', () => {
  let service: ChartOfAccountsService;
  let prisma: any;
  let snowflake: jest.Mocked<SnowflakeService>;
  let tenantContext: jest.Mocked<TenantContextService>;

  beforeEach(() => {
    prisma = {
      chart_of_accounts: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    } as any;

    snowflake = {
      generate: jest.fn(),
    } as unknown as jest.Mocked<SnowflakeService>;

    tenantContext = {
      getCompanyId: jest.fn(),
    } as unknown as jest.Mocked<TenantContextService>;

    service = new ChartOfAccountsService(prisma, snowflake, tenantContext);

    tenantContext.getCompanyId.mockReturnValue('company-1');
    snowflake.generate.mockReturnValue('acc-1');
  });

  it('should create account when code is unique', async () => {
    prisma.chart_of_accounts.findFirst.mockResolvedValueOnce(null);
    prisma.chart_of_accounts.create.mockResolvedValue({ id: 'acc-1' } as never);

    const dto = {
      account_code: '1.1.01',
      account_name: 'Caixa',
      account_type: 'ASSET',
      account_nature: 'DEBIT',
    };

    const result = await service.create(dto as any);

    expect(prisma.chart_of_accounts.findFirst).toHaveBeenCalledWith({
      where: { company_id: 'company-1', account_code: '1.1.01' },
    });
    expect(prisma.chart_of_accounts.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: 'acc-1',
        company_id: 'company-1',
        account_code: '1.1.01',
        level: 3,
        allows_entry: true,
        active: true,
      }),
    });
    expect(result).toEqual({ id: 'acc-1' });
  });

  it('should throw BadRequestException on duplicated account code', async () => {
    prisma.chart_of_accounts.findFirst.mockResolvedValueOnce({
      id: 'existing',
    } as never);

    await expect(
      service.create({
        account_code: '1.1.01',
        account_name: 'Duplicada',
        account_type: 'ASSET',
        account_nature: 'DEBIT',
      } as any),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.chart_of_accounts.create).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException when parent account does not belong to company', async () => {
    prisma.chart_of_accounts.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    await expect(
      service.create({
        account_code: '1.1.02',
        account_name: 'Conta Filho',
        account_type: 'ASSET',
        account_nature: 'DEBIT',
        parent_account_id: 'parent-1',
      } as any),
    ).rejects.toThrow(NotFoundException);
  });

  it('should list only active company accounts ordered by level then code', async () => {
    prisma.chart_of_accounts.findMany.mockResolvedValue([
      { id: 'a1' },
    ] as never);

    const result = await service.findAll();

    expect(prisma.chart_of_accounts.findMany).toHaveBeenCalledWith({
      where: { company_id: 'company-1', active: true },
      orderBy: [{ level: 'asc' }, { account_code: 'asc' }],
    });
    expect(result).toEqual([{ id: 'a1' }]);
  });

  it('should update account and recompute level when account_code is provided', async () => {
    prisma.chart_of_accounts.findFirst.mockResolvedValue({
      id: 'acc-1',
    } as never);
    prisma.chart_of_accounts.update.mockResolvedValue({ id: 'acc-1' } as never);

    await service.update('acc-1', {
      account_code: '2.1',
      account_name: 'Fornecedores',
    } as any);

    expect(prisma.chart_of_accounts.update).toHaveBeenCalledWith({
      where: { id: 'acc-1' },
      data: expect.objectContaining({
        account_code: '2.1',
        account_name: 'Fornecedores',
        level: 2,
      }),
    });
  });

  it('should soft-delete account when remove is called', async () => {
    prisma.chart_of_accounts.findFirst.mockResolvedValue({
      id: 'acc-1',
    } as never);
    prisma.chart_of_accounts.update.mockResolvedValue({ id: 'acc-1' } as never);

    await service.remove('acc-1');

    expect(prisma.chart_of_accounts.update).toHaveBeenCalledWith({
      where: { id: 'acc-1' },
      data: { active: false },
    });
  });

  it('should throw NotFoundException on update when account does not belong to company', async () => {
    prisma.chart_of_accounts.findFirst.mockResolvedValue(null);

    await expect(
      service.update('acc-404', { account_name: 'Nope' } as any),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.chart_of_accounts.update).not.toHaveBeenCalled();
  });
});
