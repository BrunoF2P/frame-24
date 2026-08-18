import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { payable_transactions, receivable_transactions } from '@repo/db';
import { PrismaService } from 'src/prisma/prisma.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { AccountsReceivableRepository } from 'src/modules/finance/accounts-receivable/repositories/accounts-receivable.repository';
import { AccountsPayableRepository } from 'src/modules/finance/accounts-payable/repositories/accounts-payable.repository';
import { CashFlowEntriesService } from 'src/modules/finance/cash-flow/services/cash-flow-entries.service';
import { CreateReceivableTransactionDto } from '../dto/create-receivable-transaction.dto';
import { CreatePayableTransactionDto } from '../dto/create-payable-transaction.dto';

type SettleReceivableForCompanyInput = {
  companyId: string;
  userId: string;
  dto: CreateReceivableTransactionDto;
};

type SettlePayableForCompanyInput = {
  companyId: string;
  userId: string;
  dto: CreatePayableTransactionDto;
};

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflake: SnowflakeService,
    private readonly receivablesRepository: AccountsReceivableRepository,
    private readonly payablesRepository: AccountsPayableRepository,
    private readonly cashFlowService: CashFlowEntriesService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Transactional()
  async settleReceivable(
    dto: CreateReceivableTransactionDto,
  ): Promise<receivable_transactions> {
    return this.settleReceivableForCompany({
      companyId: this.tenantContext.getCompanyId(),
      userId: this.tenantContext.getRequiredUserId(),
      dto,
    });
  }

  @Transactional()
  async settleReceivableForCompany(
    input: SettleReceivableForCompanyInput,
  ): Promise<receivable_transactions> {
    const { companyId, userId, dto } = input;
    const account = await this.receivablesRepository.findById(
      dto.account_receivable_id,
      companyId,
    );

    if (!account) {
      throw new NotFoundException('Account receivable not found');
    }

    if (account.status === 'paid' || account.status === 'cancelled') {
      throw new BadRequestException('Account is already paid or cancelled');
    }

    // Create transaction record
    const transaction = await this.prisma.receivable_transactions.create({
      data: {
        id: this.snowflake.generate(),
        account_receivable_id: dto.account_receivable_id,
        transaction_date: new Date(dto.transaction_date),
        amount: dto.amount,
        bank_account_id: dto.bank_account_id,
        payment_method: dto.payment_method,
        notes: dto.notes,
      },
    });

    // Update account balance and status
    const newPaidAmount = Number(account.paid_amount) + dto.amount;
    const newRemainingAmount = Number(account.remaining_amount) - dto.amount;

    let newStatus = account.status;
    if (newRemainingAmount <= 0) {
      newStatus = 'paid';
    } else {
      newStatus = 'partially_paid';
    }

    await this.receivablesRepository.updateStatus(
      account.id,
      newStatus,
      newPaidAmount,
      newRemainingAmount > 0 ? newRemainingAmount : 0,
    );

    // Create Cash Flow Entry
    await this.cashFlowService.createForCompany({
      companyId,
      createdBy: userId,
      dto: {
        bank_account_id: dto.bank_account_id,
        cinema_complex_id: account.cinema_complex_id || undefined,
        entry_type: 'receipt',
        category: 'receivable_settlement',
        amount: dto.amount,
        entry_date: dto.transaction_date,
        competence_date: account.competence_date.toISOString().split('T')[0],
        description: `Recebimento - Ref. ${account.document_number}`,
        document_number: account.document_number,
        source_type: 'ACCOUNT_RECEIVABLE',
        source_id: account.id,
        status: 'confirmed', // Settlement implies confirmed payment
        counterpart_type: 'CUSTOMER',
        counterpart_id: account.customer_id || undefined,
      },
    });

    return transaction;
  }

  @Transactional()
  async settlePayable(
    dto: CreatePayableTransactionDto,
  ): Promise<payable_transactions> {
    return this.settlePayableForCompany({
      companyId: this.tenantContext.getCompanyId(),
      userId: this.tenantContext.getRequiredUserId(),
      dto,
    });
  }

  @Transactional()
  async settlePayableForCompany(
    input: SettlePayableForCompanyInput,
  ): Promise<payable_transactions> {
    const { companyId, userId, dto } = input;
    const account = await this.payablesRepository.findById(
      dto.account_payable_id,
      companyId,
    );

    if (!account) {
      throw new NotFoundException('Account payable not found');
    }

    if (account.status === 'paid' || account.status === 'cancelled') {
      throw new BadRequestException('Account is already paid or cancelled');
    }

    // Create transaction record
    const transaction = await this.prisma.payable_transactions.create({
      data: {
        id: this.snowflake.generate(),
        account_payable_id: dto.account_payable_id,
        transaction_date: new Date(dto.transaction_date),
        amount: dto.amount,
        bank_account_id: dto.bank_account_id,
        payment_method: dto.payment_method,
        notes: dto.notes,
      },
    });

    // Update account balance and status
    const newPaidAmount = Number(account.paid_amount) + dto.amount;
    const newRemainingAmount = Number(account.remaining_amount) - dto.amount;

    let newStatus = account.status;
    if (newRemainingAmount <= 0) {
      newStatus = 'paid';
    } else {
      newStatus = 'partially_paid';
    }

    await this.payablesRepository.updateStatus(
      account.id,
      newStatus,
      newPaidAmount,
      newRemainingAmount > 0 ? newRemainingAmount : 0,
    );

    // Create Cash Flow Entry
    await this.cashFlowService.createForCompany({
      companyId,
      createdBy: userId,
      dto: {
        bank_account_id: dto.bank_account_id,
        cinema_complex_id: account.cinema_complex_id || undefined,
        entry_type: 'payment',
        category: 'payable_settlement',
        amount: dto.amount,
        entry_date: dto.transaction_date,
        competence_date: account.competence_date.toISOString().split('T')[0],
        description: `Pagamento - Ref. ${account.document_number}`,
        document_number: account.document_number,
        source_type: 'ACCOUNT_PAYABLE',
        source_id: account.id,
        status: 'confirmed',
        counterpart_type: 'SUPPLIER',
        counterpart_id: account.supplier_id || undefined,
      },
    });

    return transaction;
  }
}
