import { Injectable } from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CashFlowReportQueryDto } from '../dto/cash-flow-report.dto';
import { Prisma } from '@repo/db';

@Injectable()
export class CashFlowReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async getDailyReport(query: CashFlowReportQueryDto) {
    const companyId = this.tenantContext.getCompanyId();
    const date = query.date ? new Date(query.date) : new Date();
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const where: Prisma.cash_flow_entriesWhereInput = {
      company_id: companyId,
      entry_date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    };

    if (query.bank_account_id) {
      where.bank_account_id = query.bank_account_id;
    }

    if (query.cinema_complex_id) {
      where.cinema_complex_id = query.cinema_complex_id;
    }

    const entries = await this.prisma.cash_flow_entries.findMany({
      where,
      include: {
        bank_accounts: {
          select: {
            bank_name: true,
            account_number: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const summary = entries.reduce(
      (acc, entry) => {
        const amount = Number(entry.amount);
        if (entry.entry_type === 'receipt') {
          acc.total_receipts += amount;
        } else {
          acc.total_payments += amount;
        }
        return acc;
      },
      { total_receipts: 0, total_payments: 0 },
    );

    return {
      date: startOfDay,
      summary: {
        ...summary,
        net_balance: summary.total_receipts - summary.total_payments,
      },
      entries,
    };
  }

  async getPeriodReport(query: CashFlowReportQueryDto) {
    const companyId = this.tenantContext.getCompanyId();
    const startDate = query.start_date
      ? new Date(query.start_date)
      : new Date();
    const endDate = query.end_date ? new Date(query.end_date) : new Date();

    const where: Prisma.cash_flow_entriesWhereInput = {
      company_id: companyId,
      entry_date: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (query.bank_account_id) {
      where.bank_account_id = query.bank_account_id;
    }

    const entries = await this.prisma.cash_flow_entries.findMany({
      where,
      orderBy: { entry_date: 'asc' },
    });

    // Group by day
    const dailyData = entries.reduce(
      (acc, entry) => {
        const day = entry.entry_date.toISOString().split('T')[0];
        if (!acc[day]) {
          acc[day] = { receipts: 0, payments: 0 };
        }
        const amount = Number(entry.amount);
        if (entry.entry_type === 'receipt') {
          acc[day].receipts += amount;
        } else {
          acc[day].payments += amount;
        }
        return acc;
      },
      {} as Record<string, { receipts: number; payments: number }>,
    );

    return {
      period: { start: startDate, end: endDate },
      daily_breakdown: dailyData,
      total_entries: entries.length,
    };
  }

  async getProjection(query: CashFlowReportQueryDto) {
    const companyId = this.tenantContext.getCompanyId();
    const days = Number(query.days) || 30;
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    // Get current balance of all accounts (select only needed fields)
    const accounts = await this.prisma.bank_accounts.findMany({
      where: { company_id: companyId, active: true },
      select: { current_balance: true },
    });

    const currentTotalBalance = accounts.reduce(
      (sum, acc) => sum + Number(acc.current_balance),
      0,
    );

    // Get pending entries (select only needed fields)
    const pendingEntries = await this.prisma.cash_flow_entries.findMany({
      where: {
        company_id: companyId,
        status: 'pending',
        entry_date: {
          gte: today,
          lte: futureDate,
        },
      },
      select: {
        amount: true,
        entry_type: true,
        entry_date: true,
        description: true,
      },
      orderBy: { entry_date: 'asc' },
    });

    let projectedBalance = currentTotalBalance;
    const projection = pendingEntries.map((entry) => {
      const amount = Number(entry.amount);
      if (entry.entry_type === 'receipt') {
        projectedBalance += amount;
      } else {
        projectedBalance -= amount;
      }
      return {
        date: entry.entry_date,
        description: entry.description,
        amount: amount,
        type: entry.entry_type,
        projected_balance: projectedBalance,
      };
    });

    return {
      current_balance: currentTotalBalance,
      projection_days: days,
      projected_balance: projectedBalance,
      entries: projection,
    };
  }

  async getCategorySummary(query: CashFlowReportQueryDto) {
    const companyId = this.tenantContext.getCompanyId();
    const month = query.month || new Date().toISOString().slice(0, 7);
    const [year, monthNum] = month.split('-');
    const startDate = new Date(Number(year), Number(monthNum) - 1, 1);
    const endDate = new Date(Number(year), Number(monthNum), 0);

    const entries = await this.prisma.cash_flow_entries.groupBy({
      by: ['category', 'entry_type'],
      where: {
        company_id: companyId,
        entry_date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
    });

    return {
      period: month,
      categories: entries.map((e) => ({
        category: e.category,
        type: e.entry_type,
        total: Number(e._sum.amount || 0),
      })),
    };
  }
}
