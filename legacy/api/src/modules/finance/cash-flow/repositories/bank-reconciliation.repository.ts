import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { bank_reconciliations, Prisma } from '@repo/db';

type BankReconciliationListItem = Prisma.bank_reconciliationsGetPayload<{
  include: {
    bank_accounts: {
      select: {
        bank_name: true;
        account_number: true;
      };
    };
  };
}>;

type BankReconciliationWithBankAccount = Prisma.bank_reconciliationsGetPayload<{
  include: { bank_accounts: true };
}>;

@Injectable()
export class BankReconciliationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.bank_reconciliationsCreateInput,
  ): Promise<bank_reconciliations> {
    return this.prisma.bank_reconciliations.create({ data });
  }

  async findAll(
    companyId: string,
    bankAccountId?: string,
  ): Promise<BankReconciliationListItem[]> {
    const where: Prisma.bank_reconciliationsWhereInput = {
      bank_accounts: {
        company_id: companyId,
      },
    };

    if (bankAccountId) {
      where.bank_account_id = bankAccountId;
    }

    return this.prisma.bank_reconciliations.findMany({
      where,
      include: {
        bank_accounts: {
          select: {
            bank_name: true,
            account_number: true,
          },
        },
      },
      orderBy: { reference_month: 'desc' },
    });
  }

  async findById(
    id: string,
  ): Promise<BankReconciliationWithBankAccount | null> {
    return this.prisma.bank_reconciliations.findUnique({
      where: { id },
      include: {
        bank_accounts: true,
      },
    });
  }

  async findByMonth(
    bankAccountId: string,
    month: Date,
  ): Promise<bank_reconciliations | null> {
    return this.prisma.bank_reconciliations.findUnique({
      where: {
        bank_account_id_reference_month: {
          bank_account_id: bankAccountId,
          reference_month: month,
        },
      },
    });
  }

  async update(
    id: string,
    data: Prisma.bank_reconciliationsUpdateInput,
  ): Promise<bank_reconciliations> {
    return this.prisma.bank_reconciliations.update({
      where: { id },
      data,
    });
  }

  async getMonthlyTotals(
    bankAccountId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    total_receipts: number;
    total_payments: number;
    pending_receipts: number;
    pending_payments: number;
  }> {
    const receipts = await this.prisma.cash_flow_entries.aggregate({
      where: {
        bank_account_id: bankAccountId,
        entry_type: 'receipt',
        entry_date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: { amount: true },
    });

    const payments = await this.prisma.cash_flow_entries.aggregate({
      where: {
        bank_account_id: bankAccountId,
        entry_type: 'payment',
        entry_date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: { amount: true },
    });

    const pendingReceipts = await this.prisma.cash_flow_entries.aggregate({
      where: {
        bank_account_id: bankAccountId,
        entry_type: 'receipt',
        reconciled: false,
        entry_date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: { amount: true },
    });

    const pendingPayments = await this.prisma.cash_flow_entries.aggregate({
      where: {
        bank_account_id: bankAccountId,
        entry_type: 'payment',
        reconciled: false,
        entry_date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: { amount: true },
    });

    return {
      total_receipts: Number(receipts._sum.amount || 0),
      total_payments: Number(payments._sum.amount || 0),
      pending_receipts: Number(pendingReceipts._sum.amount || 0),
      pending_payments: Number(pendingPayments._sum.amount || 0),
    };
  }
}
