import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { bank_accounts, Prisma } from '@repo/db';
import { BankAccountsRepository } from '../repositories/bank-accounts.repository';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { CreateBankAccountDto } from '../dto/create-bank-account.dto';
import { UpdateBankAccountDto } from '../dto/update-bank-account.dto';

@Injectable()
export class BankAccountsService {
  constructor(
    private readonly repository: BankAccountsRepository,
    private readonly snowflake: SnowflakeService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(dto: CreateBankAccountDto): Promise<bank_accounts> {
    const companyId = this.tenantContext.getCompanyId();
    const id = this.snowflake.generate();

    return this.repository.create({
      id,
      company_id: companyId,
      bank_name: dto.bank_name,
      bank_code: dto.bank_code,
      agency: dto.agency,
      agency_digit: dto.agency_digit,
      account_number: dto.account_number,
      account_digit: dto.account_digit,
      account_type: dto.account_type,
      initial_balance: dto.initial_balance || 0,
      current_balance: dto.initial_balance || 0,
      description: dto.description,
      active: true,
    });
  }

  async findAll(activeOnly = true): Promise<bank_accounts[]> {
    const companyId = this.tenantContext.getCompanyId();
    return this.repository.findAll(companyId, activeOnly);
  }

  private async findOneByCompany(
    companyId: string,
    id: string,
  ): Promise<bank_accounts> {
    const account = await this.repository.findById(id, companyId);

    if (!account) {
      throw new NotFoundException('Bank account not found');
    }

    return account;
  }

  async findOne(id: string): Promise<bank_accounts> {
    return this.findOneByCompany(this.tenantContext.getCompanyId(), id);
  }

  async update(id: string, dto: UpdateBankAccountDto): Promise<bank_accounts> {
    const companyId = this.tenantContext.getCompanyId();
    await this.findOneByCompany(companyId, id);

    const result = await this.repository.update(id, companyId, {
      ...(dto.bank_name && { bank_name: dto.bank_name }),
      ...(dto.bank_code !== undefined && { bank_code: dto.bank_code }),
      ...(dto.agency && { agency: dto.agency }),
      ...(dto.agency_digit !== undefined && { agency_digit: dto.agency_digit }),
      ...(dto.account_number && { account_number: dto.account_number }),
      ...(dto.account_digit !== undefined && {
        account_digit: dto.account_digit,
      }),
      ...(dto.account_type && { account_type: dto.account_type }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.active !== undefined && { active: dto.active }),
    });

    if (result.count === 0) {
      throw new BadRequestException('Failed to update bank account');
    }

    return this.findOneByCompany(companyId, id);
  }

  async delete(id: string): Promise<Prisma.BatchPayload> {
    const companyId = this.tenantContext.getCompanyId();
    await this.findOneByCompany(companyId, id);

    return this.repository.update(id, companyId, {
      active: false,
    });
  }

  async getBalance(
    id: string,
  ): Promise<{ bank_account_id: string; current_balance: number }> {
    const companyId = this.tenantContext.getCompanyId();
    await this.findOneByCompany(companyId, id);

    const balance = Number(await this.repository.getBalance(id));

    return {
      bank_account_id: id,
      current_balance: balance,
    };
  }
}
