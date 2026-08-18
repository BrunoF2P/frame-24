import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { cash_flow_entries, Prisma } from '@repo/db';

interface CashFlowFilters {
  bank_account_id?: string;
  entry_type?: string;
  category?: string;
  start_date?: Date;
  end_date?: Date;
  status?: string;
  skip?: number;
  take?: number;
}

type CashFlowEntryListItem = Prisma.cash_flow_entriesGetPayload<{
  include: {
    bank_accounts: {
      select: {
        id: true;
        bank_name: true;
        account_number: true;
        account_type: true;
      };
    };
  };
}>;

type CashFlowEntryWithBankAccount = Prisma.cash_flow_entriesGetPayload<{
  include: { bank_accounts: true };
}>;

@Injectable()
export class CashFlowEntriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.cash_flow_entriesCreateInput,
  ): Promise<cash_flow_entries> {
    return this.prisma.cash_flow_entries.create({ data });
  }

  async findAll(
    companyId: string,
    filters: CashFlowFilters,
  ): Promise<CashFlowEntryListItem[]> {
    const where: Prisma.cash_flow_entriesWhereInput = {
      company_id: companyId,
    };

    if (filters.bank_account_id) {
      where.bank_account_id = filters.bank_account_id;
    }

    if (filters.entry_type) {
      where.entry_type = filters.entry_type;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.start_date || filters.end_date) {
      where.entry_date = {};
      if (filters.start_date) {
        where.entry_date.gte = filters.start_date;
      }
      if (filters.end_date) {
        where.entry_date.lte = filters.end_date;
      }
    }

    return this.prisma.cash_flow_entries.findMany({
      where,
      orderBy: { entry_date: 'desc' },
      skip: filters.skip || 0,
      take: filters.take || 20,
      include: {
        bank_accounts: {
          select: {
            id: true,
            bank_name: true,
            account_number: true,
            account_type: true,
          },
        },
      },
    });
  }

  async findById(
    id: string,
    companyId: string,
  ): Promise<CashFlowEntryWithBankAccount | null> {
    return this.prisma.cash_flow_entries.findFirst({
      where: {
        id,
        company_id: companyId,
      },
      include: {
        bank_accounts: true,
      },
    });
  }

  async update(
    id: string,
    companyId: string,
    data: Prisma.cash_flow_entriesUpdateInput,
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.cash_flow_entries.updateMany({
      where: {
        id,
        company_id: companyId,
        reconciled: false, // Only allow updates if not reconciled
      },
      data,
    });
  }

  async delete(id: string, companyId: string): Promise<Prisma.BatchPayload> {
    return this.prisma.cash_flow_entries.deleteMany({
      where: {
        id,
        company_id: companyId,
        reconciled: false, // Only allow deletion if not reconciled
      },
    });
  }

  async reconcile(id: string, companyId: string): Promise<Prisma.BatchPayload> {
    return this.prisma.cash_flow_entries.updateMany({
      where: {
        id,
        company_id: companyId,
      },
      data: {
        reconciled: true,
        reconciled_at: new Date(),
        status: 'reconciled',
      },
    });
  }

  async calculateBalance(
    bankAccountId: string,
    upToDate?: Date,
  ): Promise<{
    total_receipts: number;
    total_payments: number;
    net_balance: number;
  }> {
    const where: Prisma.cash_flow_entriesWhereInput = {
      bank_account_id: bankAccountId,
      reconciled: true,
    };

    if (upToDate) {
      where.entry_date = { lte: upToDate };
    }

    const receipts = await this.prisma.cash_flow_entries.aggregate({
      where: {
        ...where,
        entry_type: 'receipt',
      },
      _sum: {
        amount: true,
      },
    });

    const payments = await this.prisma.cash_flow_entries.aggregate({
      where: {
        ...where,
        entry_type: 'payment',
      },
      _sum: {
        amount: true,
      },
    });

    return {
      total_receipts: Number(receipts._sum.amount || 0),
      total_payments: Number(payments._sum.amount || 0),
      net_balance:
        Number(receipts._sum.amount || 0) - Number(payments._sum.amount || 0),
    };
  }
}
