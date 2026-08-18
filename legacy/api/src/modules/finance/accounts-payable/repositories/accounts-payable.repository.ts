import { Injectable } from '@nestjs/common';
import { accounts_payable, Prisma } from '@repo/db';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAccountPayableDto } from '../dto/create-account-payable.dto';
import { UpdateAccountPayableDto } from '../dto/update-account-payable.dto';
import { AccountPayableQueryDto } from '../dto/account-payable-query.dto';
import { SnowflakeService } from 'src/common/services/snowflake.service';

type AccountsPayableWithTransactions = Prisma.accounts_payableGetPayload<{
  include: { transactions: true };
}>;

@Injectable()
export class AccountsPayableRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflake: SnowflakeService,
  ) {}

  async create(
    companyId: string,
    dto: CreateAccountPayableDto,
  ): Promise<accounts_payable> {
    const remaining_amount =
      dto.original_amount +
      (dto.interest_amount || 0) +
      (dto.penalty_amount || 0) -
      (dto.discount_amount || 0);

    const data: Prisma.accounts_payableUncheckedCreateInput = {
      id: this.snowflake.generate(),
      company_id: companyId,
      cinema_complex_id: dto.cinema_complex_id,
      supplier_id: dto.supplier_id,
      source_type: dto.source_type,
      source_id: dto.source_id,
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

    return this.prisma.accounts_payable.create({
      data,
    });
  }

  async findAll(
    companyId: string,
    query: AccountPayableQueryDto,
  ): Promise<{
    data: accounts_payable[];
    meta: { total: number; page: number; per_page: number; last_page: number };
  }> {
    const where: Prisma.accounts_payableWhereInput = { company_id: companyId };

    if (query.cinema_complex_id) {
      where.cinema_complex_id = query.cinema_complex_id;
    }

    if (query.supplier_id) {
      where.supplier_id = query.supplier_id;
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
      this.prisma.accounts_payable.count({ where }),
      this.prisma.accounts_payable.findMany({
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
  ): Promise<AccountsPayableWithTransactions | null> {
    return this.prisma.accounts_payable.findFirst({
      where: { id, company_id: companyId },
      include: { transactions: true },
    });
  }

  async update(
    id: string,
    dto: UpdateAccountPayableDto,
  ): Promise<accounts_payable> {
    const data: Prisma.accounts_payableUncheckedUpdateInput = {
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

    return this.prisma.accounts_payable.update({
      where: { id },
      data,
    });
  }

  async updateStatus(
    id: string,
    status: string,
    paid_amount: number,
    remaining_amount: number,
  ): Promise<accounts_payable> {
    return this.prisma.accounts_payable.update({
      where: { id },
      data: { status, paid_amount, remaining_amount },
    });
  }
}
