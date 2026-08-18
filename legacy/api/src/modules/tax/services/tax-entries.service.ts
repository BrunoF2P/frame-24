import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { todayISO } from 'src/common/utils/date.util';
import { Transactional } from '@nestjs-cls/transactional';
import { tax_entries } from '@repo/db';
import { TaxEntriesRepository } from '../repositories/tax-entries.repository';
import {
  TaxCalculationResult,
  TaxCalculationService,
} from './tax-calculation.service';
import { CreateTaxEntryDto } from '../dto/create-tax-entry.dto';
import { TaxEntryResponseDto } from '../dto/tax-entry-response.dto';
import { CinemaComplexesRepository } from 'src/modules/operations/cinema-complexes/repositories/cinema-complexes.repository';
import { LoggerService } from 'src/common/services/logger.service';
import { RabbitMQPublisherService } from 'src/common/rabbitmq/rabbitmq-publisher.service';

import { CashFlowEntriesService } from 'src/modules/finance/cash-flow/services/cash-flow-entries.service';
import { BankAccountsRepository } from 'src/modules/finance/cash-flow/repositories/bank-accounts.repository';
import { TenantResourceService } from 'src/common/services/tenant-resource.service';

@Injectable()
export class TaxEntriesService {
  constructor(
    private readonly taxEntriesRepository: TaxEntriesRepository,
    private readonly taxCalculationService: TaxCalculationService,
    private readonly tenantResource: TenantResourceService,
    private readonly cinemaComplexesRepository: CinemaComplexesRepository,
    private readonly logger: LoggerService,
    private readonly rabbitmq: RabbitMQPublisherService,
    private readonly cashFlowEntriesService: CashFlowEntriesService,
    private readonly bankAccountsRepository: BankAccountsRepository,
    private readonly tenantContext: TenantContextService,
  ) {}

  async findAll(filters?: {
    cinema_complex_id?: string;
    source_type?: string;
    source_id?: string;
    start_date?: Date;
    end_date?: Date;
    processed?: boolean;
  }): Promise<TaxEntryResponseDto[]> {
    const companyId = this.tenantContext.getCompanyId();
    if (filters?.cinema_complex_id) {
      await this.tenantResource.assertCinemaComplexBelongsToCompany(
        companyId,
        filters.cinema_complex_id,
      );
    }
    const entries = await this.taxEntriesRepository.findAll(companyId, filters);

    return entries.map((entry) => this.mapToDto(entry));
  }

  async findOne(id: string): Promise<TaxEntryResponseDto> {
    const companyId = this.tenantContext.getCompanyId();
    const entry = await this.taxEntriesRepository.findById(id);

    if (!entry) {
      throw new NotFoundException('Lançamento fiscal não encontrado');
    }

    // Validar que o complexo pertence à empresa
    const complex = await this.cinemaComplexesRepository.findById(
      entry.cinema_complex_id,
    );
    if (!complex || complex.company_id !== companyId) {
      throw new NotFoundException('Lançamento fiscal não encontrado');
    }

    return this.mapToDto(entry);
  }

  @Transactional()
  async create(dto: CreateTaxEntryDto): Promise<TaxEntryResponseDto> {
    const companyId = this.tenantContext.getCompanyId();
    const userId = this.tenantContext.getRequiredUserId();

    await this.tenantResource.assertCinemaComplexBelongsToCompany(
      companyId,
      dto.cinema_complex_id,
    );
    await this.ensureSourceUniqueness(dto);

    const calculation = await this.taxCalculationService.calculateTaxes(
      {
        gross_amount: dto.gross_amount,
        deductions_amount: dto.deductions_amount,
        cinema_complex_id: dto.cinema_complex_id,
        competence_date: dto.competence_date,
        revenue_type: dto.revenue_type,
        pis_cofins_regime: dto.pis_cofins_regime,
      },
      { companyId },
    );

    const entry = await this.createTaxEntry(dto, calculation, userId);
    await this.publishTaxEntryCreatedEvent(
      companyId,
      userId,
      entry,
      calculation,
    );

    this.logger.log(
      `Lançamento fiscal criado: ${entry.id} - R$ ${calculation.gross_amount.toFixed(2)}`,
      TaxEntriesService.name,
    );

    await this.createProjectedTaxCashFlow(companyId, dto, entry);

    return this.mapToDto(entry);
  }

  private mapToDto(entry: tax_entries): TaxEntryResponseDto {
    const issAmount = Number(entry.iss_amount || 0);
    const pisPayable = Number(entry.pis_amount_payable);
    const cofinsPayable = Number(entry.cofins_amount_payable);
    const totalTaxes = issAmount + pisPayable + cofinsPayable;
    const netAmount = Number(entry.calculation_base) - totalTaxes;

    return {
      id: entry.id,
      cinema_complex_id: entry.cinema_complex_id,
      source_type: entry.source_type ?? undefined,
      source_id: entry.source_id ?? undefined,
      competence_date: entry.competence_date.toISOString().split('T')[0],
      gross_amount: entry.gross_amount.toString(),
      deductions_amount: (entry.deductions_amount || 0).toString(),
      calculation_base: entry.calculation_base.toString(),
      iss_rate: (entry.iss_rate || 0).toString(),
      iss_amount: issAmount.toString(),
      pis_rate: entry.pis_rate.toString(),
      pis_debit_amount: entry.pis_debit_amount.toString(),
      pis_credit_amount: (entry.pis_credit_amount || 0).toString(),
      pis_amount_payable: pisPayable.toString(),
      cofins_rate: entry.cofins_rate.toString(),
      cofins_debit_amount: entry.cofins_debit_amount.toString(),
      cofins_credit_amount: (entry.cofins_credit_amount || 0).toString(),
      cofins_amount_payable: cofinsPayable.toString(),
      total_taxes: totalTaxes.toString(),
      net_amount: netAmount.toString(),
      processed: entry.processed || false,
      created_at: entry.created_at?.toISOString() || new Date().toISOString(),
    };
  }

  private async ensureSourceUniqueness(dto: CreateTaxEntryDto): Promise<void> {
    if (!dto.source_type || !dto.source_id) {
      return;
    }

    const existing = await this.taxEntriesRepository.findBySource(
      dto.source_type,
      dto.source_id,
    );

    if (existing) {
      throw new BadRequestException(
        'Já existe um lançamento fiscal para esta origem',
      );
    }
  }

  private async createTaxEntry(
    dto: CreateTaxEntryDto,
    calculation: TaxCalculationResult,
    userId: string,
  ): Promise<tax_entries> {
    const applyIss = dto.apply_iss !== false;

    return this.taxEntriesRepository.create({
      cinema_complex_id: dto.cinema_complex_id,
      ...(dto.source_type && { source_type: dto.source_type }),
      ...(dto.source_id && { source_id: dto.source_id }),
      competence_date: dto.competence_date,
      gross_amount: calculation.gross_amount,
      deductions_amount: calculation.deductions_amount,
      calculation_base: calculation.calculation_base,
      apply_iss: applyIss,
      iss_rate: calculation.iss_rate,
      iss_amount: applyIss ? calculation.iss_amount : 0,
      ibge_municipality_code: calculation.ibge_municipality_code,
      ...(calculation.iss_service_code && {
        iss_service_code: calculation.iss_service_code,
      }),
      pis_cofins_regime: calculation.pis_cofins_regime,
      pis_rate: calculation.pis_rate,
      pis_debit_amount: calculation.pis_debit_amount,
      pis_credit_amount: calculation.pis_credit_amount,
      pis_amount_payable: calculation.pis_amount_payable,
      cofins_rate: calculation.cofins_rate,
      cofins_debit_amount: calculation.cofins_debit_amount,
      cofins_credit_amount: calculation.cofins_credit_amount,
      cofins_amount_payable: calculation.cofins_amount_payable,
      processing_user_id: userId,
      processing_date: new Date(),
      processed: true,
    });
  }

  private async publishTaxEntryCreatedEvent(
    companyId: string,
    userId: string,
    entry: tax_entries,
    calculation: TaxCalculationResult,
  ): Promise<void> {
    await this.rabbitmq.publish({
      pattern: 'audit.tax.entry.created',
      data: {
        id: entry.id,
        values: entry,
        calculation,
      },
      metadata: { companyId, userId },
    });
  }

  private async createProjectedTaxCashFlow(
    companyId: string,
    dto: CreateTaxEntryDto,
    entry: tax_entries,
  ): Promise<void> {
    try {
      const bankAccounts = await this.bankAccountsRepository.findAll(companyId);
      const defaultAccount = bankAccounts.find((account) => account.active);

      if (!defaultAccount) {
        return;
      }

      const totalTaxes =
        Number(entry.iss_amount || 0) +
        Number(entry.pis_amount_payable) +
        Number(entry.cofins_amount_payable);

      if (totalTaxes <= 0) {
        return;
      }

      await this.cashFlowEntriesService.createForCompany({
        companyId,
        createdBy: 'SYSTEM',
        dto: {
          bank_account_id: defaultAccount.id,
          cinema_complex_id: dto.cinema_complex_id,
          entry_type: 'payment',
          category: 'tax',
          amount: totalTaxes,
          entry_date: todayISO(),
          competence_date: dto.competence_date.toISOString().split('T')[0],
          description: `Impostos (ISS/PIS/COFINS) - Ref. ${entry.id}`,
          document_number: entry.id,
          source_type: 'TAX_ENTRY',
          source_id: entry.id,
          status: 'pending',
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error(
        `Erro ao criar lançamento de fluxo de caixa para impostos ${entry.id}: ${errorMessage}`,
        TaxEntriesService.name,
      );
    }
  }
}
