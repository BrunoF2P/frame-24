import { BadRequestException } from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { FinanceReportsService } from './finance-reports.service';

describe('FinanceReportsService', () => {
  let service: FinanceReportsService;
  let prisma: any;
  let tenantContext: jest.Mocked<TenantContextService>;

  beforeEach(() => {
    prisma = {
      cinema_complexes: {
        findMany: jest.fn(),
      },
      sales: {
        aggregate: jest.fn(),
      },
      distributor_settlements: {
        aggregate: jest.fn(),
      },
      tax_entries: {
        aggregate: jest.fn(),
      },
      accounts_payable: {
        groupBy: jest.fn(),
      },
    } as any;

    tenantContext = {
      getCompanyId: jest.fn(),
    } as unknown as jest.Mocked<TenantContextService>;

    tenantContext.getCompanyId.mockReturnValue('company-1');
    service = new FinanceReportsService(prisma, tenantContext);
  });

  it('should throw BadRequestException for invalid month format', async () => {
    await expect(service.getIncomeStatement('2026-13')).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.getIncomeStatement('not-a-month')).rejects.toThrow(
      'Formato de mês inválido. Use YYYY-MM.',
    );
  });

  it('should return zeroed report when company has no complexes', async () => {
    prisma.cinema_complexes.findMany.mockResolvedValue([] as never);

    const result = await service.getIncomeStatement('2026-03');

    expect(result).toEqual({
      period: '2026-03',
      gross_revenue: 0,
      discounts: 0,
      net_revenue: 0,
      distributor_payouts: 0,
      taxes: 0,
      operational_result: 0,
      net_result: 0,
    });
    expect(prisma.sales.aggregate).not.toHaveBeenCalled();
  });

  it('should calculate income statement from aggregated sources', async () => {
    prisma.cinema_complexes.findMany.mockResolvedValue([
      { id: 'complex-1' },
    ] as never);

    prisma.sales.aggregate.mockResolvedValue({
      _sum: {
        total_amount: 1000,
        discount_amount: 100,
        net_amount: 900,
      },
    } as never);

    prisma.distributor_settlements.aggregate.mockResolvedValue({
      _sum: {
        net_payment_amount: 250,
      },
    } as never);

    prisma.tax_entries.aggregate.mockResolvedValue({
      _sum: {
        iss_amount: 30,
        pis_amount_payable: 20,
        cofins_amount_payable: 10,
      },
    } as never);

    prisma.accounts_payable.groupBy.mockResolvedValue([
      { expense_type: 'administrative', _sum: { original_amount: 80 } },
      { expense_type: 'selling', _sum: { original_amount: 40 } },
      { expense_type: 'financial', _sum: { original_amount: 10 } },
      { expense_type: 'operational', _sum: { original_amount: 50 } },
    ] as never);

    const result = await service.getIncomeStatement('2026-03');

    expect(prisma.sales.aggregate).toHaveBeenCalled();
    expect(prisma.distributor_settlements.aggregate).toHaveBeenCalled();
    expect(prisma.tax_entries.aggregate).toHaveBeenCalled();
    expect(prisma.accounts_payable.groupBy).toHaveBeenCalled();

    expect(result.period).toBe('2026-03');
    expect(result.gross_revenue).toBe(1000);
    expect(result.sales_deductions).toBe(160);
    expect(result.net_revenue).toBe(840);
    expect(result.cost_of_services).toBe(300);
    expect(result.gross_profit).toBe(540);
    expect(result.expenses).toEqual({
      administrative: 80,
      selling: 40,
      financial: 10,
    });
    expect(result.operational_result).toBe(420);
    expect(result.net_result).toBe(410);
    expect(result.metrics).toBeDefined();
    expect(result.metrics!.gross_margin).toBeCloseTo(64.2857, 3);
    expect(result.metrics!.net_margin).toBeCloseTo(48.8095, 3);
  });
});
