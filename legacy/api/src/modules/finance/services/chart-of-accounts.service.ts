import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { CreateChartAccountDto } from '../dto/create-chart-account.dto';
import { UpdateChartAccountDto } from '../dto/create-chart-account.dto';

@Injectable()
export class ChartOfAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflake: SnowflakeService,
    private readonly tenantContext: TenantContextService,
  ) {}

  private getLevelFromCode(accountCode: string): number {
    return accountCode.split('.').length;
  }

  async create(dto: CreateChartAccountDto) {
    const companyId = this.tenantContext.getCompanyId();
    const existing = await this.prisma.chart_of_accounts.findFirst({
      where: { company_id: companyId, account_code: dto.account_code },
    });

    if (existing) {
      throw new BadRequestException('Código de conta já utilizado');
    }

    if (dto.parent_account_id) {
      await this.ensureAccountBelongsToCompany(
        companyId,
        dto.parent_account_id,
      );
    }

    return this.prisma.chart_of_accounts.create({
      data: {
        id: this.snowflake.generate(),
        company_id: companyId,
        account_code: dto.account_code,
        account_name: dto.account_name,
        account_type: dto.account_type,
        account_nature: dto.account_nature,
        parent_account_id: dto.parent_account_id,
        allows_entry: dto.allows_entry === undefined ? true : dto.allows_entry,
        level: this.getLevelFromCode(dto.account_code),
        active: true,
      },
    });
  }

  async findAll() {
    const companyId = this.tenantContext.getCompanyId();
    return this.prisma.chart_of_accounts.findMany({
      where: { company_id: companyId, active: true },
      orderBy: [{ level: 'asc' }, { account_code: 'asc' }],
    });
  }

  async update(id: string, dto: UpdateChartAccountDto) {
    const companyId = this.tenantContext.getCompanyId();
    await this.ensureAccountBelongsToCompany(companyId, id);

    if (dto.parent_account_id) {
      await this.ensureAccountBelongsToCompany(
        companyId,
        dto.parent_account_id,
      );
    }

    return this.prisma.chart_of_accounts.update({
      where: { id },
      data: {
        account_name: dto.account_name,
        account_type: dto.account_type,
        account_nature: dto.account_nature,
        parent_account_id: dto.parent_account_id,
        allows_entry: dto.allows_entry,
        level: dto.account_code
          ? this.getLevelFromCode(dto.account_code)
          : undefined,
        account_code: dto.account_code,
      },
    });
  }

  async remove(id: string) {
    const companyId = this.tenantContext.getCompanyId();
    await this.ensureAccountBelongsToCompany(companyId, id);
    return this.prisma.chart_of_accounts.update({
      where: { id },
      data: { active: false },
    });
  }

  private async ensureAccountBelongsToCompany(companyId: string, id: string) {
    const account = await this.prisma.chart_of_accounts.findFirst({
      where: { id, company_id: companyId },
    });

    if (!account) {
      throw new NotFoundException('Conta contábil não encontrada');
    }
  }
}
