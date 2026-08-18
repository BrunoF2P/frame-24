import { BadRequestException, Injectable } from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class FinanceReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  private parseMonth(month: string): {
    start: Date;
    end: Date;
    year: number;
    monthNumber: number;
  } {
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const monthNumber = parseInt(monthStr, 10);
    if (
      isNaN(year) ||
      isNaN(monthNumber) ||
      monthNumber < 1 ||
      monthNumber > 12
    ) {
      throw new BadRequestException('Formato de mês inválido. Use YYYY-MM.');
    }
    const start = new Date(Date.UTC(year, monthNumber - 1, 1));
    const end = new Date(Date.UTC(year, monthNumber, 0, 23, 59, 59, 999));
    return { start, end, year, monthNumber };
  }

  private async getCompanyComplexIds(companyId: string): Promise<string[]> {
    const complexes = await this.prisma.cinema_complexes.findMany({
      where: { company_id: companyId },
      select: { id: true },
    });
    return complexes.map((c) => c.id);
  }

  async getIncomeStatement(month: string) {
    const companyId = this.tenantContext.getCompanyId();
    const { start, end, year, monthNumber } = this.parseMonth(month);
    const complexIds = await this.getCompanyComplexIds(companyId);

    if (complexIds.length === 0) {
      return {
        period: `${year}-${String(monthNumber).padStart(2, '0')}`,
        gross_revenue: 0,
        discounts: 0,
        net_revenue: 0,
        distributor_payouts: 0,
        taxes: 0,
        operational_result: 0,
        net_result: 0,
      };
    }

    // 1. Revenue (Sales)
    const salesAggregate = await this.prisma.sales.aggregate({
      _sum: {
        total_amount: true,
        discount_amount: true,
        net_amount: true,
      },
      where: {
        cinema_complex_id: { in: complexIds },
        sale_date: {
          gte: start,
          lte: end,
        },
      },
    });

    // 2. Distributor Payouts (Cost of Services)
    const settlementsAggregate =
      await this.prisma.distributor_settlements.aggregate({
        _sum: {
          net_payment_amount: true,
        },
        where: {
          cinema_complex_id: { in: complexIds },
          competence_start_date: { lte: end },
          competence_end_date: { gte: start },
        },
      });

    // 3. Taxes
    const taxAggregate = await this.prisma.tax_entries.aggregate({
      _sum: {
        iss_amount: true,
        pis_amount_payable: true,
        cofins_amount_payable: true,
      },
      where: {
        cinema_complex_id: { in: complexIds },
        competence_date: {
          gte: start,
          lte: end,
        },
      },
    });

    // 4. Operating Expenses (Accounts Payable)
    const expensesAggregate = await this.prisma.accounts_payable.groupBy({
      by: ['expense_type'],
      _sum: {
        original_amount: true,
      },
      where: {
        company_id: companyId,
        competence_date: {
          gte: start,
          lte: end,
        },
        status: { not: 'cancelled' },
        expense_type: { not: null },
      },
    });

    // Map expenses
    let administrativeExpenses = 0;
    let sellingExpenses = 0;
    let financialExpenses = 0;
    let operationalExpenses = 0; // Other COGS

    for (const expense of expensesAggregate) {
      const amount = Number(expense._sum.original_amount || 0);
      switch (expense.expense_type) {
        case 'administrative':
          administrativeExpenses += amount;
          break;
        case 'selling':
          sellingExpenses += amount;
          break;
        case 'financial':
          financialExpenses += amount;
          break;
        case 'operational':
          operationalExpenses += amount;
          break;
      }
    }

    const grossRevenue = Number(salesAggregate._sum.total_amount || 0);
    const discounts = Number(salesAggregate._sum.discount_amount || 0);

    const distributorPayouts = Number(
      settlementsAggregate._sum.net_payment_amount || 0,
    );

    const taxes =
      Number(taxAggregate._sum.iss_amount || 0) +
      Number(taxAggregate._sum.pis_amount_payable || 0) +
      Number(taxAggregate._sum.cofins_amount_payable || 0);

    // Gross Profit = Net Revenue - Direct Costs (Distributors + Taxes + Operational Expenses)
    // Note: Taxes are usually deducted from Gross Revenue to get Net Revenue, but here we are listing them explicitly.
    // Standard DRE: Gross Rev - Deductions (Taxes on Sales) = Net Rev.
    // Net Rev - COGS (Distributors) = Gross Profit.

    // Let's align with standard DRE structure:
    // Gross Revenue
    // (-) Sales Deductions (Discounts, Cancelled) -> We have discounts. Taxes on sales (PIS/COFINS/ISS) are also deductions from Gross Revenue.
    // = Net Revenue

    // Let's adjust the calculation to be more accounting-correct.
    const salesTaxes = taxes; // Assuming these are taxes on revenue
    const realNetRevenue = grossRevenue - discounts - salesTaxes;

    const costOfServices = distributorPayouts + operationalExpenses;
    const grossProfit = realNetRevenue - costOfServices;

    const operationalResult =
      grossProfit - administrativeExpenses - sellingExpenses;

    const netResult = operationalResult - financialExpenses;

    return {
      period: `${year}-${String(monthNumber).padStart(2, '0')}`,
      gross_revenue: grossRevenue,
      sales_deductions: discounts + salesTaxes,
      net_revenue: realNetRevenue,

      cost_of_services: costOfServices,
      gross_profit: grossProfit,

      expenses: {
        administrative: administrativeExpenses,
        selling: sellingExpenses,
        financial: financialExpenses,
      },

      operational_result: operationalResult,
      net_result: netResult,

      metrics: {
        gross_margin:
          realNetRevenue > 0 ? (grossProfit / realNetRevenue) * 100 : 0,
        net_margin: realNetRevenue > 0 ? (netResult / realNetRevenue) * 100 : 0,
      },
    };
  }
}
