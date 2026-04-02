import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { accounts_payable, Prisma } from '@repo/db';
import { AccountsPayableRepository } from '../repositories/accounts-payable.repository';
import { CreateAccountPayableDto } from '../dto/create-account-payable.dto';
import { UpdateAccountPayableDto } from '../dto/update-account-payable.dto';
import { AccountPayableQueryDto } from '../dto/account-payable-query.dto';

type AccountsPayableWithTransactions = Prisma.accounts_payableGetPayload<{
  include: { transactions: true };
}>;

type AccountsPayableListResponse = {
  data: accounts_payable[];
  meta: { total: number; page: number; per_page: number; last_page: number };
};

type CreateAccountPayableForCompanyInput = {
  companyId: string;
  dto: CreateAccountPayableDto;
};

@Injectable()
export class AccountsPayableService {
  constructor(
    private readonly repository: AccountsPayableRepository,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(dto: CreateAccountPayableDto): Promise<accounts_payable> {
    return this.createForCompany({
      companyId: this.tenantContext.getCompanyId(),
      dto,
    });
  }

  async createForCompany(
    input: CreateAccountPayableForCompanyInput,
  ): Promise<accounts_payable> {
    const { companyId, dto } = input;
    return this.repository.create(companyId, dto);
  }

  async findAll(
    query: AccountPayableQueryDto,
  ): Promise<AccountsPayableListResponse> {
    return this.repository.findAll(this.tenantContext.getCompanyId(), query);
  }

  private async findOneByCompany(
    companyId: string,
    id: string,
  ): Promise<AccountsPayableWithTransactions> {
    const account = await this.repository.findById(id, companyId);
    if (!account) {
      throw new NotFoundException('Account payable not found');
    }
    return account;
  }

  async findOne(id: string): Promise<AccountsPayableWithTransactions> {
    return this.findOneByCompany(this.tenantContext.getCompanyId(), id);
  }

  async update(
    id: string,
    dto: UpdateAccountPayableDto,
  ): Promise<accounts_payable> {
    const companyId = this.tenantContext.getCompanyId();
    const account = await this.findOneByCompany(companyId, id);

    if (account.status === 'paid' || account.status === 'cancelled') {
      throw new BadRequestException('Cannot update paid or cancelled accounts');
    }

    return this.repository.update(id, dto);
  }
}
