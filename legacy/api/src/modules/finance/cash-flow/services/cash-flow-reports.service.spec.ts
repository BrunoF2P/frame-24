import { TenantContextService } from 'src/common/services/tenant-context.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CashFlowReportsService } from './cash-flow-reports.service';

describe('CashFlowReportsService', () => {
  let service: CashFlowReportsService;
  let prisma: any;
  let tenantContext: jest.Mocked<TenantContextService>;

  beforeEach(() => {
    prisma = {
      cash_flow_entries: {
        findMany: jest.fn(),
        groupBy: jest.fn(),
      },
      bank_accounts: {
        findMany: jest.fn(),
      },
    } as any;

    tenantContext = {
      getCompanyId: jest.fn(),
    } as unknown as jest.Mocked<TenantContextService>;

    tenantContext.getCompanyId.mockReturnValue('company-1');
    service = new CashFlowReportsService(prisma, tenantContext);
  });

  it('should build daily report summary with net balance', async () => {
    prisma.cash_flow_entries.findMany.mockResolvedValue([
      {
        entry_type: 'receipt',
        amount: 100,
        created_at: new Date(),
        bank_accounts: {},
      },
      {
        entry_type: 'payment',
        amount: 25,
        created_at: new Date(),
        bank_accounts: {},
      },
      {
        entry_type: 'receipt',
        amount: 10,
        created_at: new Date(),
        bank_accounts: {},
      },
    ] as never);

    const result = await service.getDailyReport({ date: '2026-03-22' } as any);

    expect(prisma.cash_flow_entries.findMany).toHaveBeenCalled();
    expect(result.summary).toEqual({
      total_receipts: 110,
      total_payments: 25,
      net_balance: 85,
    });
    expect(result.entries).toHaveLength(3);
  });

  it('should group period report by day and keep total entries', async () => {
    prisma.cash_flow_entries.findMany.mockResolvedValue([
      {
        entry_type: 'receipt',
        amount: 100,
        entry_date: new Date('2026-03-01'),
      },
      { entry_type: 'payment', amount: 50, entry_date: new Date('2026-03-01') },
      { entry_type: 'receipt', amount: 30, entry_date: new Date('2026-03-02') },
    ] as never);

    const result = await service.getPeriodReport({
      start_date: '2026-03-01',
      end_date: '2026-03-31',
    } as any);

    expect(result.total_entries).toBe(3);
    expect(result.daily_breakdown['2026-03-01']).toEqual({
      receipts: 100,
      payments: 50,
    });
    expect(result.daily_breakdown['2026-03-02']).toEqual({
      receipts: 30,
      payments: 0,
    });
  });

  it('should project future balance from pending entries', async () => {
    prisma.bank_accounts.findMany.mockResolvedValue([
      { current_balance: 200 },
      { current_balance: 50 },
    ] as never);
    prisma.cash_flow_entries.findMany.mockResolvedValue([
      {
        amount: 100,
        entry_type: 'receipt',
        entry_date: new Date('2026-03-23'),
        description: 'incoming',
      },
      {
        amount: 40,
        entry_type: 'payment',
        entry_date: new Date('2026-03-24'),
        description: 'expense',
      },
    ] as never);

    const result = await service.getProjection({ days: 10 } as any);

    expect(result.current_balance).toBe(250);
    expect(result.projected_balance).toBe(310);
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].projected_balance).toBe(350);
    expect(result.entries[1].projected_balance).toBe(310);
  });

  it('should summarize by category and entry type', async () => {
    prisma.cash_flow_entries.groupBy.mockResolvedValue([
      { category: 'ticket_sale', entry_type: 'receipt', _sum: { amount: 500 } },
      {
        category: 'supplier_payment',
        entry_type: 'payment',
        _sum: { amount: 300 },
      },
    ] as never);

    const result = await service.getCategorySummary({
      month: '2026-03',
    } as any);

    expect(result.period).toBe('2026-03');
    expect(result.categories).toEqual([
      { category: 'ticket_sale', type: 'receipt', total: 500 },
      { category: 'supplier_payment', type: 'payment', total: 300 },
    ]);
  });
});
