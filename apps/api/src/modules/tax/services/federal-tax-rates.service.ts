import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { Prisma, federal_tax_rates } from '@repo/db';
import { FederalTaxRatesRepository } from '../repositories/federal-tax-rates.repository';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { CreateFederalTaxRateDto } from '../dto/create-federal-tax-rate.dto';
import { UpdateFederalTaxRateDto } from '../dto/update-federal-tax-rate.dto';

@Injectable()
export class FederalTaxRatesService {
  constructor(
    private readonly repository: FederalTaxRatesRepository,
    private readonly snowflake: SnowflakeService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(dto: CreateFederalTaxRateDto): Promise<federal_tax_rates> {
    const companyId = this.tenantContext.getCompanyId();
    const payload: Prisma.federal_tax_ratesCreateInput = {
      id: this.snowflake.generate(),
      company_id: companyId,
      tax_regime: dto.tax_regime,
      pis_cofins_regime: dto.pis_cofins_regime,
      revenue_type: dto.revenue_type,
      pis_rate: dto.pis_rate,
      cofins_rate: dto.cofins_rate,
      credit_allowed: dto.credit_allowed ?? false,
      irpj_base_rate: dto.irpj_base_rate,
      irpj_additional_rate: dto.irpj_additional_rate,
      irpj_additional_limit: dto.irpj_additional_limit,
      csll_rate: dto.csll_rate,
      presumed_profit_percentage: dto.presumed_profit_percentage,
      validity_start: dto.validity_start,
      validity_end: dto.validity_end,
      active: dto.active ?? true,
    };

    return this.repository.create(payload);
  }

  async list(): Promise<federal_tax_rates[]> {
    return this.repository.findAllByCompany(this.tenantContext.getCompanyId());
  }

  async findById(id: string): Promise<federal_tax_rates> {
    const companyId = this.tenantContext.getCompanyId();
    const record = await this.repository.findById(id);

    if (!record || record.company_id !== companyId) {
      throw new NotFoundException('Taxa federal não encontrada.');
    }

    return record;
  }

  async update(
    id: string,
    dto: UpdateFederalTaxRateDto,
  ): Promise<federal_tax_rates> {
    await this.findById(id);

    const payload: Prisma.federal_tax_ratesUpdateInput = {
      ...(dto.tax_regime !== undefined && { tax_regime: dto.tax_regime }),
      ...(dto.pis_cofins_regime !== undefined && {
        pis_cofins_regime: dto.pis_cofins_regime,
      }),
      ...(dto.revenue_type !== undefined && {
        revenue_type: dto.revenue_type,
      }),
      ...(dto.pis_rate !== undefined && { pis_rate: dto.pis_rate }),
      ...(dto.cofins_rate !== undefined && { cofins_rate: dto.cofins_rate }),
      ...(dto.credit_allowed !== undefined && {
        credit_allowed: dto.credit_allowed,
      }),
      ...(dto.irpj_base_rate !== undefined && {
        irpj_base_rate: dto.irpj_base_rate,
      }),
      ...(dto.irpj_additional_rate !== undefined && {
        irpj_additional_rate: dto.irpj_additional_rate,
      }),
      ...(dto.irpj_additional_limit !== undefined && {
        irpj_additional_limit: dto.irpj_additional_limit,
      }),
      ...(dto.csll_rate !== undefined && { csll_rate: dto.csll_rate }),
      ...(dto.presumed_profit_percentage !== undefined && {
        presumed_profit_percentage: dto.presumed_profit_percentage,
      }),
      ...(dto.validity_start && { validity_start: dto.validity_start }),
      ...(dto.validity_end !== undefined && {
        validity_end: dto.validity_end ?? null,
      }),
      ...(dto.active !== undefined && { active: dto.active }),
    };

    return this.repository.update(id, payload);
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.repository.delete(id);
  }
}
