import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import { Transactional } from '@nestjs-cls/transactional';
import { LoggerService } from 'src/common/services/logger.service';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { CreatePosSessionDto } from '../dto/create-pos-session.dto';
import { UpdatePosSessionDto } from '../dto/update-pos-session.dto';
import { PosSessionResponseDto } from '../dto/pos-session-response.dto';
import { PosSessionsRepository } from '../repositories/pos-sessions.repository';
import { PosSessionStatusRepository } from '../repositories/pos-session-status.repository';
import { PosTransactionsRepository } from '../repositories/pos-transactions.repository';

@Injectable()
export class PosSessionsService {
  constructor(
    private readonly posSessionsRepo: PosSessionsRepository,
    private readonly posSessionStatusRepo: PosSessionStatusRepository,
    private readonly posTransactionsRepo: PosTransactionsRepository,
    private readonly logger: LoggerService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Transactional()
  async create(dto: CreatePosSessionDto): Promise<PosSessionResponseDto> {
    const companyId = this.tenantContext.getCompanyId();
    const operatorId = this.tenantContext.getRequiredUserId();

    const openStatus = await this.posSessionStatusRepo.findByName(
      companyId,
      'Aberta',
    );

    if (!openStatus) {
      throw new BadRequestException(
        'Status "Aberta" não encontrado. Configure os status de sessão PDV antes de abrir o caixa.',
      );
    }

    const existingOpen = await this.posSessionsRepo.findOpenSessionByComplex(
      dto.cinema_complex_id,
      companyId,
    );

    if (existingOpen) {
      throw new ConflictException(
        'Já existe uma sessão PDV aberta para este complexo. Feche a sessão atual antes de abrir uma nova.',
      );
    }

    const sessionNumber = await this.generateSessionNumber(companyId);

    const session = await this.posSessionsRepo.create({
      company_id: companyId,
      cinema_complex_id: dto.cinema_complex_id,
      operator_id: operatorId,
      pos_session_status: { connect: { id: openStatus.id } },
      session_number: sessionNumber,
      opening_amount: new Prisma.Decimal(dto.opening_amount ?? 0),
    } as Prisma.pos_sessionsCreateInput);

    this.logger.log(
      `POS session opened: ${sessionNumber}`,
      PosSessionsService.name,
    );

    return this.mapToDto(session, openStatus.name);
  }

  async findAll(filters?: {
    status?: string;
    cinema_complex_id?: string;
  }): Promise<PosSessionResponseDto[]> {
    const companyId = this.tenantContext.getCompanyId();
    const sessions = await this.posSessionsRepo.findAll(companyId, filters);

    return sessions.map((s) =>
      this.mapToDto(
        s,
        (s as typeof s & { pos_session_status?: { name: string } })
          .pos_session_status?.name,
      ),
    );
  }

  async findOne(id: string): Promise<PosSessionResponseDto> {
    const companyId = this.tenantContext.getCompanyId();
    const session = await this.posSessionsRepo.findByIdWithStatus(
      id,
      companyId,
    );

    if (!session) {
      throw new NotFoundException('Sessão PDV não encontrada');
    }

    const totals = await this.posTransactionsRepo.sumAmountsBySession(
      id,
      companyId,
    );

    return this.mapToDto(
      { ...session, ...totals },
      session.pos_session_status?.name,
    );
  }

  @Transactional()
  async update(
    id: string,
    dto: UpdatePosSessionDto,
  ): Promise<PosSessionResponseDto> {
    const companyId = this.tenantContext.getCompanyId();
    const session = await this.posSessionsRepo.findByIdWithStatus(
      id,
      companyId,
    );

    if (!session) {
      throw new NotFoundException('Sessão PDV não encontrada');
    }

    if (dto.status) {
      let targetStatus = await this.posSessionStatusRepo.findById(
        dto.status,
        companyId,
      );

      if (!targetStatus) {
        targetStatus = await this.posSessionStatusRepo.findByName(
          dto.status,
          companyId,
        );
      }

      if (!targetStatus) {
        throw new BadRequestException('Status de sessão PDV inválido');
      }

      if (targetStatus.name === 'Fechada') {
        return this.closeSession(id, session, dto, companyId);
      }

      const updateData: Prisma.pos_sessionsUpdateInput = {
        pos_session_status: { connect: { id: targetStatus.id } },
      };
      if (dto.cash_withdrawn !== undefined) {
        updateData.cash_withdrawn = new Prisma.Decimal(dto.cash_withdrawn);
      }
      if (dto.closing_notes !== undefined) {
        updateData.closing_notes = dto.closing_notes;
      }

      const updated = await this.posSessionsRepo.update(id, updateData);
      this.logger.log(
        `POS session updated: ${session.session_number}`,
        PosSessionsService.name,
      );
      return this.mapToDto(updated, targetStatus.name);
    }

    const updateData: Prisma.pos_sessionsUpdateInput = {};
    if (dto.cash_withdrawn !== undefined) {
      updateData.cash_withdrawn = new Prisma.Decimal(dto.cash_withdrawn);
    }
    if (dto.closing_notes !== undefined) {
      updateData.closing_notes = dto.closing_notes;
    }

    const updated = await this.posSessionsRepo.update(id, updateData);
    this.logger.log(
      `POS session updated: ${session.session_number}`,
      PosSessionsService.name,
    );
    return this.mapToDto(updated, session.pos_session_status?.name);
  }

  private async closeSession(
    id: string,
    session: {
      id: string;
      session_number: string;
      status: string;
      opening_amount: Prisma.Decimal;
      cash_withdrawn: Prisma.Decimal;
      pos_session_status?: { name: string };
    },
    dto: UpdatePosSessionDto,
    companyId: string,
  ): Promise<PosSessionResponseDto> {
    const closedStatus = await this.posSessionStatusRepo.findByName(
      companyId,
      'Fechada',
    );

    if (!closedStatus) {
      throw new BadRequestException(
        'Status "Fechada" não encontrado. Configure os status de sessão PDV.',
      );
    }

    const totals = await this.posTransactionsRepo.sumAmountsBySession(
      id,
      companyId,
    );

    const openingAmount = Number(session.opening_amount ?? 0);
    const cashWithdrawn = Number(session.cash_withdrawn ?? 0);

    const expectedCash =
      openingAmount +
      totals.totalSalesAmount -
      totals.totalRefundsAmount -
      cashWithdrawn;

    const cashCounted = dto.cash_counted ?? expectedCash;
    const difference = cashCounted - expectedCash;

    const updated = await this.posSessionsRepo.update(id, {
      pos_session_status: { connect: { id: closedStatus.id } },
      cash_counted: new Prisma.Decimal(cashCounted),
      difference: new Prisma.Decimal(difference),
      total_sales_amount: new Prisma.Decimal(totals.totalSalesAmount),
      total_sales_count: totals.totalSalesCount,
      total_refunds_amount: new Prisma.Decimal(totals.totalRefundsAmount),
      total_refunds_count: totals.totalRefundsCount,
      total_discounts_amount: new Prisma.Decimal(totals.totalDiscountsAmount),
      total_received_amount: new Prisma.Decimal(totals.totalReceivedAmount),
      total_change_given: new Prisma.Decimal(totals.totalChangeGiven),
      closed_at: new Date(),
      ...(dto.closing_notes !== undefined && {
        closing_notes: dto.closing_notes,
      }),
    });

    this.logger.log(
      `POS session closed: ${session.session_number} | Difference: ${difference}`,
      PosSessionsService.name,
    );

    return this.mapToDto(updated, closedStatus.name);
  }

  async getStatuses() {
    const companyId = this.tenantContext.getCompanyId();
    return this.posSessionStatusRepo.findAll(companyId);
  }

  private async generateSessionNumber(companyId: string): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `PDV-${dateStr}`;

    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const todayEnd = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1,
    );

    const count = await this.posSessionsRepo.countByCompanyAndStatus(
      companyId,
      'open',
    );

    const seq = (count || 0) + 1;
    return `${prefix}-${seq.toString().padStart(3, '0')}`;
  }

  private mapToDto(
    session: Record<string, unknown>,
    statusName?: string,
  ): PosSessionResponseDto {
    return {
      id: session.id as string,
      company_id: session.company_id as string,
      cinema_complex_id: session.cinema_complex_id as string,
      operator_id: session.operator_id as string,
      status: session.status as string,
      ...(statusName && { status_name: statusName }),
      session_number: session.session_number as string,
      opening_amount: Number(session.opening_amount ?? 0),
      cash_withdrawn: Number(session.cash_withdrawn ?? 0),
      cash_counted:
        session.cash_counted != null ? Number(session.cash_counted) : null,
      difference:
        session.difference != null ? Number(session.difference) : null,
      total_sales_amount: Number(session.total_sales_amount ?? 0),
      total_sales_count: Number(session.total_sales_count ?? 0),
      total_refunds_amount: Number(session.total_refunds_amount ?? 0),
      total_refunds_count: Number(session.total_refunds_count ?? 0),
      total_discounts_amount: Number(session.total_discounts_amount ?? 0),
      total_received_amount: Number(session.total_received_amount ?? 0),
      total_change_given: Number(session.total_change_given ?? 0),
      opened_at:
        session.opened_at instanceof Date
          ? session.opened_at.toISOString()
          : String(session.opened_at ?? ''),
      closed_at:
        session.closed_at instanceof Date
          ? session.closed_at.toISOString()
          : (session.closed_at as string | null),
      closing_notes: (session.closing_notes as string | null) ?? null,
      created_at:
        session.created_at instanceof Date
          ? session.created_at.toISOString()
          : String(session.created_at ?? ''),
      updated_at:
        session.updated_at instanceof Date
          ? session.updated_at.toISOString()
          : (session.updated_at as string | null),
    };
  }
}
