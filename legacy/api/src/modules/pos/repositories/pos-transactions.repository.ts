import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { Prisma, pos_transactions } from '@repo/db';

@Injectable()
export class PosTransactionsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflake: SnowflakeService,
  ) {}

  async findById(
    id: string,
    company_id: string,
  ): Promise<pos_transactions | null> {
    return this.prisma.pos_transactions.findFirst({
      where: { id, company_id },
    });
  }

  async findBySession(
    pos_session_id: string,
    company_id: string,
  ): Promise<pos_transactions[]> {
    return this.prisma.pos_transactions.findMany({
      where: { pos_session_id, company_id },
      include: {
        pos_payment_methods: { select: { name: true } },
      },
      orderBy: { performed_at: 'desc' },
    });
  }

  async create(
    data: Prisma.pos_transactionsCreateInput,
  ): Promise<pos_transactions> {
    return this.prisma.pos_transactions.create({
      data: { id: this.snowflake.generate(), ...data },
    });
  }

  async sumAmountsBySession(
    pos_session_id: string,
    company_id: string,
  ): Promise<{
    totalSalesAmount: number;
    totalSalesCount: number;
    totalRefundsAmount: number;
    totalRefundsCount: number;
    totalDiscountsAmount: number;
    totalReceivedAmount: number;
    totalChangeGiven: number;
  }> {
    const transactions = await this.prisma.pos_transactions.findMany({
      where: { pos_session_id, company_id },
      select: { transaction_type: true, amount: true, change_amount: true },
    });

    let totalSalesAmount = 0;
    let totalSalesCount = 0;
    let totalRefundsAmount = 0;
    let totalRefundsCount = 0;
    let totalDiscountsAmount = 0;
    let totalReceivedAmount = 0;
    let totalChangeGiven = 0;

    for (const tx of transactions) {
      const amount = Number(tx.amount);
      const change = Number(tx.change_amount ?? 0);

      switch (tx.transaction_type) {
        case 'sale':
          totalSalesAmount += amount;
          totalSalesCount += 1;
          totalReceivedAmount += amount;
          totalChangeGiven += change;
          break;
        case 'refund':
          totalRefundsAmount += amount;
          totalRefundsCount += 1;
          totalReceivedAmount -= amount;
          break;
        case 'discount':
          totalDiscountsAmount += amount;
          break;
        case 'withdrawal':
          totalChangeGiven += amount;
          break;
        case 'cash_in':
          totalReceivedAmount += amount;
          break;
      }
    }

    return {
      totalSalesAmount,
      totalSalesCount,
      totalRefundsAmount,
      totalRefundsCount,
      totalDiscountsAmount,
      totalReceivedAmount,
      totalChangeGiven,
    };
  }
}
