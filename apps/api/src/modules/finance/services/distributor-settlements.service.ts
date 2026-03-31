import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { todayISO } from 'src/common/utils/date.util';
import { CreateDistributorSettlementDto } from '../dto/create-distributor-settlement.dto';

import { AccountsPayableService } from '../accounts-payable/services/accounts-payable.service';

type FindDistributorSettlementsForCompanyInput = {
  companyId: string;
  cinemaComplexId?: string;
};

type CreateDistributorSettlementForCompanyInput = {
  companyId: string;
  dto: CreateDistributorSettlementDto;
};

type SettlementContractContext = {
  id: string;
  cinema_complex_id: string;
  movie_id: string;
};

@Injectable()
export class DistributorSettlementsService {
  private readonly logger = new Logger(DistributorSettlementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflake: SnowflakeService,
    private readonly accountsPayableService: AccountsPayableService,
    private readonly tenantContext: TenantContextService,
  ) {}

  private async ensureComplexBelongsToCompany(
    cinemaComplexId: string,
    companyId: string,
  ) {
    const complex = await this.prisma.cinema_complexes.findFirst({
      where: { id: cinemaComplexId, company_id: companyId },
    });

    if (!complex) {
      throw new NotFoundException('Complexo não pertence à empresa');
    }
  }

  private async ensureContractBelongsToCompany(
    contractId: string,
    companyId: string,
  ): Promise<SettlementContractContext> {
    const contract = await this.prisma.exhibition_contracts.findFirst({
      where: { id: contractId },
      select: { id: true, cinema_complex_id: true, movie_id: true },
    });

    if (!contract) {
      throw new NotFoundException('Contrato não pertence à empresa');
    }

    await this.ensureComplexBelongsToCompany(
      contract.cinema_complex_id,
      companyId,
    );

    return {
      id: contract.id,
      cinema_complex_id: contract.cinema_complex_id,
      movie_id: contract.movie_id,
    };
  }

  private async ensureDistributorBelongsToCompany(
    distributorId: string,
    companyId: string,
  ) {
    const distributor = await this.prisma.suppliers.findFirst({
      where: { id: distributorId, company_id: companyId },
    });

    if (!distributor) {
      throw new NotFoundException('Distribuidor não pertence à empresa');
    }
  }

  private async getCompanyComplexIds(companyId: string): Promise<string[]> {
    const complexes = await this.prisma.cinema_complexes.findMany({
      where: { company_id: companyId },
      select: { id: true },
    });
    return complexes.map((c) => c.id);
  }

  private async getContractIdsByComplexIds(
    complexIds: string[],
  ): Promise<string[]> {
    if (!complexIds.length) return [];

    const contracts = await this.prisma.exhibition_contracts.findMany({
      where: {
        cinema_complex_id: { in: complexIds },
      },
      select: { id: true },
    });
    return contracts.map((c) => c.id);
  }

  async findAll(cinemaComplexId?: string) {
    return this.findAllForCompany({
      companyId: this.tenantContext.getCompanyId(),
      cinemaComplexId,
    });
  }

  async findAllForCompany(input: FindDistributorSettlementsForCompanyInput) {
    const { companyId, cinemaComplexId } = input;
    const complexIds = await this.getCompanyComplexIds(companyId);
    const contractIds = await this.getContractIdsByComplexIds(complexIds);

    return this.prisma.distributor_settlements.findMany({
      where: {
        cinema_complex_id: cinemaComplexId || { in: complexIds },
        contract_id: { in: contractIds },
      },
      orderBy: {
        competence_start_date: 'desc',
      },
    });
  }

  async create(dto: CreateDistributorSettlementDto) {
    return this.createForCompany({
      companyId: this.tenantContext.getCompanyId(),
      dto,
    });
  }

  async createForCompany(input: CreateDistributorSettlementForCompanyInput) {
    const { companyId, dto } = input;
    const contract = await this.ensureContractBelongsToCompany(
      dto.contract_id,
      companyId,
    );
    await this.ensureDistributorBelongsToCompany(dto.distributor_id, companyId);
    await this.ensureComplexBelongsToCompany(dto.cinema_complex_id, companyId);

    if (contract.cinema_complex_id !== dto.cinema_complex_id) {
      throw new BadRequestException(
        'Contrato informado não pertence ao complexo de cinema selecionado',
      );
    }

    const competenceStart = new Date(dto.competence_start_date);
    const competenceEnd = new Date(dto.competence_end_date);

    if (
      Number.isNaN(competenceStart.getTime()) ||
      Number.isNaN(competenceEnd.getTime())
    ) {
      throw new BadRequestException('Período de competência inválido');
    }

    if (competenceEnd < competenceStart) {
      throw new BadRequestException(
        'Data final da competência não pode ser anterior à inicial',
      );
    }

    const reconciled = await this.reconcileGrossRevenueAndTickets({
      cinemaComplexId: dto.cinema_complex_id,
      movieId: contract.movie_id,
      competenceStart,
      competenceEnd,
    });

    const gross = reconciled.grossBoxOfficeRevenue;
    const distributorPercentage = dto.distributor_percentage / 100;
    const calculatedAmount = Number((gross * distributorPercentage).toFixed(2));
    const deductions = dto.deductions_amount || 0;
    const taxes = dto.taxes_deducted_amount || 0;
    const finalAmount = Math.max(calculatedAmount - deductions, 0);
    const netAmount = Math.max(finalAmount - taxes, 0);

    const settlement = await this.prisma.distributor_settlements.create({
      data: {
        id: this.snowflake.generate(),
        contract_id: dto.contract_id,
        distributor_id: dto.distributor_id,
        cinema_complex_id: dto.cinema_complex_id,
        competence_start_date: new Date(dto.competence_start_date),
        competence_end_date: new Date(dto.competence_end_date),
        total_tickets_sold: reconciled.totalTicketsSold,
        gross_box_office_revenue: gross,
        distributor_percentage: dto.distributor_percentage,
        calculated_settlement_amount: calculatedAmount,
        deductions_amount: deductions,
        taxes_deducted_amount: taxes,
        final_settlement_amount: finalAmount,
        net_payment_amount: netAmount,
        settlement_base_amount: finalAmount,
        net_settlement_amount: netAmount,
        notes: dto.notes,
        calculation_date: new Date(),
      },
    });

    // Create Account Payable
    try {
      if (netAmount > 0) {
        await this.accountsPayableService.createForCompany({
          companyId,
          dto: {
            cinema_complex_id: dto.cinema_complex_id,
            supplier_id: dto.distributor_id,
            source_type: 'distributor_settlement',
            source_id: settlement.id,
            document_number: `SETT-${settlement.id.substring(0, 8)}`,
            description: `Acerto Distribuidor - Contrato ${dto.contract_id}`,
            issue_date: todayISO(),
            due_date: new Date(dto.competence_end_date)
              .toISOString()
              .split('T')[0], // Assuming due date is end of competence
            competence_date: new Date(dto.competence_start_date)
              .toISOString()
              .split('T')[0],
            original_amount: netAmount,
            interest_amount: 0,
            penalty_amount: 0,
            discount_amount: 0,
          },
        });
      }
    } catch (error) {
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Erro ao criar conta a pagar para acerto', stack);
      // Não falha a criação do acerto em caso de erro no contas a pagar
    }

    return settlement;
  }

  private async reconcileGrossRevenueAndTickets(params: {
    cinemaComplexId: string;
    movieId: string;
    competenceStart: Date;
    competenceEnd: Date;
  }): Promise<{ grossBoxOfficeRevenue: number; totalTicketsSold: number }> {
    const competenceStartAt = new Date(params.competenceStart);
    competenceStartAt.setHours(0, 0, 0, 0);

    const competenceEndAt = new Date(params.competenceEnd);
    competenceEndAt.setHours(23, 59, 59, 999);

    const result = await this.prisma.$queryRaw<
      Array<{ gross_revenue: number | null; total_tickets_sold: number | null }>
    >`
      SELECT
        COALESCE(SUM(t.total_amount), 0) AS gross_revenue,
        COUNT(t.id) AS total_tickets_sold
      FROM "sales"."tickets" t
      INNER JOIN "sales"."sales" s ON s.id = t.sale_id
      INNER JOIN "operations"."showtime_schedule" sh ON sh.id = t.showtime_id
      WHERE
        sh.cinema_complex_id = ${params.cinemaComplexId}
        AND sh.movie_id = ${params.movieId}
        AND s.sale_date >= ${competenceStartAt}
        AND s.sale_date <= ${competenceEndAt}
        AND s.cancellation_date IS NULL
    `;

    const aggregate = result[0];
    const grossBoxOfficeRevenue = Number(aggregate?.gross_revenue ?? 0);
    const totalTicketsSold = Number(aggregate?.total_tickets_sold ?? 0);

    return {
      grossBoxOfficeRevenue,
      totalTicketsSold,
    };
  }
}
