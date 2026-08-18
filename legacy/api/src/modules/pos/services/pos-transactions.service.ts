import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import { Transactional } from '@nestjs-cls/transactional';
import { LoggerService } from 'src/common/services/logger.service';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { CreatePosTransactionDto } from '../dto/create-pos-transaction.dto';
import { PosTransactionResponseDto } from '../dto/pos-transaction-response.dto';
import { PosTransactionsRepository } from '../repositories/pos-transactions.repository';
import { PosSessionsRepository } from '../repositories/pos-sessions.repository';
import { PosPaymentMethodsRepository } from '../repositories/pos-payment-methods.repository';

@Injectable()
export class PosTransactionsService {
  constructor(
    private readonly posTransactionsRepo: PosTransactionsRepository,
    private readonly posSessionsRepo: PosSessionsRepository,
    private readonly posPaymentMethodsRepo: PosPaymentMethodsRepository,
    private readonly logger: LoggerService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Transactional()
  async create(
    dto: CreatePosTransactionDto,
  ): Promise<PosTransactionResponseDto> {
    const companyId = this.tenantContext.getCompanyId();
    const operatorId = this.tenantContext.getRequiredUserId();

    const session = await this.posSessionsRepo.findById(
      dto.pos_session_id,
      companyId,
    );

    if (!session) {
      throw new NotFoundException('Sessão PDV não encontrada');
    }

    const sessionStatus = session as typeof session & {
      pos_session_status?: { name: string };
    };
    if (
      sessionStatus.pos_session_status?.name === 'Fechada' ||
      !session.opened_at
    ) {
      throw new BadRequestException(
        'Não é possível registrar transações em uma sessão fechada',
      );
    }

    const paymentMethod = await this.posPaymentMethodsRepo.findById(
      dto.payment_method,
      companyId,
    );

    if (!paymentMethod) {
      throw new NotFoundException('Método de pagamento não encontrado');
    }

    const transaction = await this.posTransactionsRepo.create({
      pos_sessions: { connect: { id: dto.pos_session_id } },
      pos_payment_methods: { connect: { id: dto.payment_method } },
      company_id: companyId,
      cinema_complex_id: session.cinema_complex_id,
      operator_id: operatorId,
      transaction_type: dto.transaction_type,
      amount: new Prisma.Decimal(dto.amount),
      change_amount: new Prisma.Decimal(dto.change_amount ?? 0),
      description: dto.description,
      reference_type: dto.reference_type,
      reference_id: dto.reference_id,
    } as Prisma.pos_transactionsCreateInput);

    this.logger.log(
      `POS transaction created: ${dto.transaction_type} - ${dto.amount}`,
      PosTransactionsService.name,
    );

    return this.mapToDto(transaction, paymentMethod.name);
  }

  async findBySession(
    pos_session_id: string,
  ): Promise<PosTransactionResponseDto[]> {
    const companyId = this.tenantContext.getCompanyId();
    const transactions = await this.posTransactionsRepo.findBySession(
      pos_session_id,
      companyId,
    );

    return transactions.map((t) =>
      this.mapToDto(
        t,
        (t as typeof t & { pos_payment_methods?: { name: string } })
          .pos_payment_methods?.name,
      ),
    );
  }

  async findOne(id: string): Promise<PosTransactionResponseDto> {
    const companyId = this.tenantContext.getCompanyId();
    const transaction = await this.posTransactionsRepo.findById(id, companyId);

    if (!transaction) {
      throw new NotFoundException('Transação PDV não encontrada');
    }

    return this.mapToDto(transaction);
  }

  private mapToDto(
    transaction: Record<string, unknown>,
    paymentMethodName?: string,
  ): PosTransactionResponseDto {
    return {
      id: transaction.id as string,
      pos_session_id: transaction.pos_session_id as string,
      sale_id: (transaction.sale_id as string | null) ?? null,
      company_id: transaction.company_id as string,
      cinema_complex_id: transaction.cinema_complex_id as string,
      operator_id: transaction.operator_id as string,
      transaction_type: transaction.transaction_type as string,
      payment_method: transaction.payment_method as string,
      ...(paymentMethodName && { payment_method_name: paymentMethodName }),
      amount: Number(transaction.amount ?? 0),
      change_amount: Number(transaction.change_amount ?? 0),
      description: (transaction.description as string | null) ?? null,
      reference_type: (transaction.reference_type as string | null) ?? null,
      reference_id: (transaction.reference_id as string | null) ?? null,
      performed_at:
        transaction.performed_at instanceof Date
          ? transaction.performed_at.toISOString()
          : String(transaction.performed_at ?? ''),
      created_at:
        transaction.created_at instanceof Date
          ? transaction.created_at.toISOString()
          : String(transaction.created_at ?? ''),
    };
  }
}
