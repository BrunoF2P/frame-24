import { Injectable } from '@nestjs/common';
import { accounts_receivable, Prisma } from '@repo/db';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAccountReceivableDto } from '../dto/create-account-receivable.dto';
import { UpdateAccountReceivableDto } from '../dto/update-account-receivable.dto';
import { AccountReceivableQueryDto } from '../dto/account-receivable-query.dto';
import { SnowflakeService } from 'src/common/services/snowflake.service';

type AccountsReceivableWithTransactions = Prisma.accounts_receivableGetPayload<{
  include: { transactions: true };
}>;

@Injectable()
export class AccountsReceivableRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflake: SnowflakeService,
  ) {}

  async create(
    companyId: string,
    dto: CreateAccountReceivableDto,
  ): Promise<accounts_receivable> {
    const remaining_amount =
      dto.original_amount +
      (dto.interest_amount || 0) +
      (dto.penalty_amount || 0) -
      (dto.discount_amount || 0);

    const data: Prisma.accounts_receivableUncheckedCreateInput = {
      id: this.snowflake.generate(),
      company_id: companyId,
      cinema_complex_id: dto.cinema_complex_id,
      customer_id: dto.customer_id,
      sale_id: dto.sale_id,
      document_number: dto.document_number,
      description: dto.description,
      issue_date: new Date(dto.issue_date),
      due_date: new Date(dto.due_date),
      competence_date: new Date(dto.competence_date),
      original_amount: dto.original_amount,
      interest_amount: dto.interest_amount ?? 0,
      penalty_amount: dto.penalty_amount ?? 0,
      discount_amount: dto.discount_amount ?? 0,
      remaining_amount,
      status: 'pending',
    };

    return this.prisma.accounts_receivable.create({
      data,
    });
  }

  async findAll(
    companyId: string,
    query: AccountReceivableQueryDto,
  ): Promise<{
    data: accounts_receivable[];
    meta: { total: number; page: number; per_page: number; last_page: number };
  }> {
    const where: Prisma.accounts_receivableWhereInput = {
      company_id: companyId,
    };

    if (query.cinema_complex_id) {
      where.cinema_complex_id = query.cinema_complex_id;
    }

    if (query.customer_id) {
      where.customer_id = query.customer_id;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.start_due_date && query.end_due_date) {
      where.due_date = {
        gte: new Date(query.start_due_date),
        lte: new Date(query.end_due_date),
      };
    }

    const skip = (query.page - 1) * query.per_page;

    const [total, data] = await Promise.all([
      this.prisma.accounts_receivable.count({ where }),
      this.prisma.accounts_receivable.findMany({
        where,
        skip,
        take: query.per_page,
        orderBy: { due_date: 'asc' },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page: query.page,
        per_page: query.per_page,
        last_page: Math.ceil(total / query.per_page),
      },
    };
  }

  async findById(
    id: string,
    companyId: string,
  ): Promise<AccountsReceivableWithTransactions | null> {
    return this.prisma.accounts_receivable.findFirst({
      where: { id, company_id: companyId },
      include: { transactions: true },
    });
  }

  async findBySaleId(
    saleId: string,
    companyId: string,
  ): Promise<accounts_receivable[]> {
    return this.prisma.accounts_receivable.findMany({
      where: {
        sale_id: saleId,
        company_id: companyId,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async cancelBySaleId(
    saleId: string,
    companyId: string,
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.accounts_receivable.updateMany({
      where: {
        sale_id: saleId,
        company_id: companyId,
        status: { in: ['pending', 'partially_paid', 'overdue'] },
      },
      data: {
        status: 'cancelled',
        remaining_amount: 0,
      },
    });
  }

  async update(
    id: string,
    dto: UpdateAccountReceivableDto,
  ): Promise<accounts_receivable> {
    const data: Prisma.accounts_receivableUncheckedUpdateInput = {
      document_number: dto.document_number,
      description: dto.description,
      issue_date: dto.issue_date ? new Date(dto.issue_date) : undefined,
      due_date: dto.due_date ? new Date(dto.due_date) : undefined,
      competence_date: dto.competence_date
        ? new Date(dto.competence_date)
        : undefined,
      interest_amount: dto.interest_amount,
      penalty_amount: dto.penalty_amount,
      discount_amount: dto.discount_amount,
    };

    return this.prisma.accounts_receivable.update({
      where: { id },
      data,
    });
  }

  async updateStatus(
    id: string,
    status: string,
    paid_amount: number,
    remaining_amount: number,
  ): Promise<accounts_receivable> {
    return this.prisma.accounts_receivable.update({
      where: { id },
      data: { status, paid_amount, remaining_amount },
    });
  }
}
