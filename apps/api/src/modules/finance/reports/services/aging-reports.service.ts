import { Injectable } from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { Prisma } from '@repo/db';
import { PrismaService } from 'src/prisma/prisma.service';
import { AgingReportQueryDto } from '../dto/aging-report-query.dto';

type AgingItem = {
  id: string;
  document_number: string;
  issue_date: Date;
  due_date: Date;
  original_amount: Prisma.Decimal;
  remaining_amount: Prisma.Decimal;
  status: string;
  customer_id?: string | null;
  supplier_id?: string | null;
};

type AgingBucketItem = AgingItem & { days_diff: number };

type AgingBucket = {
  label: string;
  amount: number;
  count: number;
  items: AgingBucketItem[];
};

type AgingBuckets = {
  overdue_90_plus: AgingBucket;
  overdue_61_90: AgingBucket;
  overdue_31_60: AgingBucket;
  overdue_1_30: AgingBucket;
  due_today: AgingBucket;
  coming_1_30: AgingBucket;
  coming_31_60: AgingBucket;
  coming_61_90: AgingBucket;
  coming_90_plus: AgingBucket;
};

@Injectable()
export class AgingReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async getReceivablesAging(query: AgingReportQueryDto) {
    const companyId = this.tenantContext.getCompanyId();
    const baseDate = query.base_date ? new Date(query.base_date) : new Date();
    const where: Prisma.accounts_receivableWhereInput = {
      company_id: companyId,
      status: { in: ['pending', 'partially_paid', 'overdue'] },
    };

    if (query.cinema_complex_id) {
      where.cinema_complex_id = query.cinema_complex_id;
    }

    const receivables = await this.prisma.accounts_receivable.findMany({
      where,
      select: {
        id: true,
        document_number: true,
        customer_id: true,
        issue_date: true,
        due_date: true,
        original_amount: true,
        remaining_amount: true,
        status: true,
      },
    });

    return this.calculateAging(receivables, baseDate);
  }

  async getPayablesAging(query: AgingReportQueryDto) {
    const companyId = this.tenantContext.getCompanyId();
    const baseDate = query.base_date ? new Date(query.base_date) : new Date();
    const where: Prisma.accounts_payableWhereInput = {
      company_id: companyId,
      status: { in: ['pending', 'partially_paid', 'overdue'] },
    };

    if (query.cinema_complex_id) {
      where.cinema_complex_id = query.cinema_complex_id;
    }

    const payables = await this.prisma.accounts_payable.findMany({
      where,
      select: {
        id: true,
        document_number: true,
        supplier_id: true,
        issue_date: true,
        due_date: true,
        original_amount: true,
        remaining_amount: true,
        status: true,
      },
    });

    return this.calculateAging(payables, baseDate);
  }

  private calculateAging(
    items: AgingItem[],
    baseDate: Date,
  ): { base_date: string; total_amount: number; buckets: AgingBuckets } {
    const buckets: AgingBuckets = {
      overdue_90_plus: {
        label: 'Overdue > 90 days',
        amount: 0,
        count: 0,
        items: [],
      },
      overdue_61_90: {
        label: 'Overdue 61-90 days',
        amount: 0,
        count: 0,
        items: [],
      },
      overdue_31_60: {
        label: 'Overdue 31-60 days',
        amount: 0,
        count: 0,
        items: [],
      },
      overdue_1_30: {
        label: 'Overdue 1-30 days',
        amount: 0,
        count: 0,
        items: [],
      },
      due_today: {
        label: 'Due Today',
        amount: 0,
        count: 0,
        items: [],
      },
      coming_1_30: {
        label: 'Coming 1-30 days',
        amount: 0,
        count: 0,
        items: [],
      },
      coming_31_60: {
        label: 'Coming 31-60 days',
        amount: 0,
        count: 0,
        items: [],
      },
      coming_61_90: {
        label: 'Coming 61-90 days',
        amount: 0,
        count: 0,
        items: [],
      },
      coming_90_plus: {
        label: 'Coming > 90 days',
        amount: 0,
        count: 0,
        items: [],
      },
    };

    let totalAmount = 0;

    items.forEach((item) => {
      const dueDate = new Date(item.due_date);
      const diffTime = dueDate.getTime() - baseDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const amount = Number(item.remaining_amount);

      totalAmount += amount;

      let bucketKey = '';

      if (diffDays < 0) {
        // Overdue
        const overdueDays = Math.abs(diffDays);
        if (overdueDays > 90) bucketKey = 'overdue_90_plus';
        else if (overdueDays > 60) bucketKey = 'overdue_61_90';
        else if (overdueDays > 30) bucketKey = 'overdue_31_60';
        else bucketKey = 'overdue_1_30';
      } else if (diffDays === 0) {
        bucketKey = 'due_today';
      } else {
        // Coming due
        if (diffDays <= 30) bucketKey = 'coming_1_30';
        else if (diffDays <= 60) bucketKey = 'coming_31_60';
        else if (diffDays <= 90) bucketKey = 'coming_61_90';
        else bucketKey = 'coming_90_plus';
      }

      const key = bucketKey as keyof typeof buckets;
      buckets[key].amount += amount;
      buckets[key].count += 1;
      buckets[key].items.push({
        ...item,
        days_diff: diffDays,
      });
    });

    return {
      base_date: baseDate.toISOString().split('T')[0],
      total_amount: totalAmount,
      buckets,
    };
  }
}
