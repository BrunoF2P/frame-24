import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { JournalEntriesService } from './journal-entries.service';

describe('JournalEntriesService', () => {
  let service: JournalEntriesService;
  let prisma: any;
  let snowflake: jest.Mocked<SnowflakeService>;
  let tenantContext: jest.Mocked<TenantContextService>;

  beforeEach(() => {
    prisma = {
      cinema_complexes: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      chart_of_accounts: {
        findMany: jest.fn(),
      },
      journal_entries: {
        count: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    } as any;

    snowflake = {
      generate: jest.fn(),
    } as unknown as jest.Mocked<SnowflakeService>;

    tenantContext = {
      getCompanyId: jest.fn(),
    } as unknown as jest.Mocked<TenantContextService>;

    service = new JournalEntriesService(prisma, snowflake, tenantContext);

    tenantContext.getCompanyId.mockReturnValue('company-1');
    snowflake.generate
      .mockReturnValueOnce('entry-1')
      .mockReturnValueOnce('item-1')
      .mockReturnValueOnce('item-2');
  });

  it('should create balanced journal entry with generated number and items', async () => {
    prisma.cinema_complexes.findFirst.mockResolvedValue({
      id: 'complex-1',
    } as never);
    prisma.chart_of_accounts.findMany.mockResolvedValue([
      { id: 'acc-1' },
      { id: 'acc-2' },
    ] as never);
    prisma.cinema_complexes.findMany.mockResolvedValue([
      { id: 'complex-1' },
    ] as never);
    prisma.journal_entries.count.mockResolvedValue(0);
    prisma.journal_entries.create.mockResolvedValue({ id: 'entry-1' } as never);
    prisma.journal_entries.findUnique.mockResolvedValue({
      id: 'entry-1',
      journal_entry_items: [{ id: 'item-1' }, { id: 'item-2' }],
    } as never);

    const dto = {
      cinema_complex_id: 'complex-1',
      entry_date: '2026-03-20',
      description: 'Venda balcão',
      origin_type: 'SALE',
      origin_id: 'sale-1',
      items: [
        {
          account_id: 'acc-1',
          movement_type: 'DEBIT',
          amount: 100,
          item_description: 'Caixa',
        },
        {
          account_id: 'acc-2',
          movement_type: 'CREDIT',
          amount: 100,
          item_description: 'Receita',
        },
      ],
    };

    const result = await service.create(dto as any);

    expect(prisma.journal_entries.count).toHaveBeenCalled();
    expect(prisma.journal_entries.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: 'entry-1',
        cinema_complex_id: 'complex-1',
        total_amount: 100,
        journal_entry_items: {
          create: [
            expect.objectContaining({ id: 'item-1', account_id: 'acc-1' }),
            expect.objectContaining({ id: 'item-2', account_id: 'acc-2' }),
          ],
        },
      }),
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 'entry-1',
      }),
    );
  });

  it('should throw when complex does not belong to company', async () => {
    prisma.cinema_complexes.findFirst.mockResolvedValue(null);

    await expect(
      service.create({
        cinema_complex_id: 'complex-404',
        entry_date: '2026-03-20',
        description: 'Teste',
        items: [
          {
            account_id: 'acc-1',
            movement_type: 'DEBIT',
            amount: 10,
          },
          {
            account_id: 'acc-2',
            movement_type: 'CREDIT',
            amount: 10,
          },
        ],
      } as any),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw when debit and credit totals do not match', async () => {
    prisma.cinema_complexes.findFirst.mockResolvedValue({
      id: 'complex-1',
    } as never);
    prisma.chart_of_accounts.findMany.mockResolvedValue([
      { id: 'acc-1' },
      { id: 'acc-2' },
    ] as never);

    await expect(
      service.create({
        cinema_complex_id: 'complex-1',
        entry_date: '2026-03-20',
        description: 'Desequilibrado',
        items: [
          {
            account_id: 'acc-1',
            movement_type: 'DEBIT',
            amount: 100,
          },
          {
            account_id: 'acc-2',
            movement_type: 'CREDIT',
            amount: 50,
          },
        ],
      } as any),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.journal_entries.create).not.toHaveBeenCalled();
  });

  it('should find all entries filtered by complex and period', async () => {
    prisma.cinema_complexes.findMany.mockResolvedValue([
      { id: 'complex-1' },
      { id: 'complex-2' },
    ] as never);
    prisma.journal_entries.findMany.mockResolvedValue([
      { id: 'entry-1' },
    ] as never);

    const result = await service.findAll({
      cinema_complex_id: 'complex-1',
      start_date: '2026-03-01',
      end_date: '2026-03-31',
    });

    expect(prisma.journal_entries.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        cinema_complex_id: 'complex-1',
        entry_date: {
          gte: new Date('2026-03-01'),
          lte: new Date('2026-03-31'),
        },
      }),
      include: { journal_entry_items: true },
      orderBy: { entry_date: 'desc' },
    });
    expect(result).toEqual([{ id: 'entry-1' }]);
  });
});
