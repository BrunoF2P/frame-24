import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { bank_reconciliations } from '@repo/db';
import { BankReconciliationRepository } from '../repositories/bank-reconciliation.repository';
import { BankAccountsRepository } from '../repositories/bank-accounts.repository';
import {
  CreateBankReconciliationDto,
  UpdateBankReconciliationDto,
} from '../dto/bank-reconciliation.dto';
import { SnowflakeService } from 'src/common/services/snowflake.service';

type CreateBankReconciliationForCompanyInput = {
  companyId: string;
  createdBy: string;
  dto: CreateBankReconciliationDto;
};

@Injectable()
export class BankReconciliationService {
  constructor(
    private readonly repository: BankReconciliationRepository,
    private readonly bankAccountsRepository: BankAccountsRepository,
    private readonly snowflake: SnowflakeService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(
    dto: CreateBankReconciliationDto,
  ): Promise<bank_reconciliations> {
    return this.createForCompany({
      companyId: this.tenantContext.getCompanyId(),
      createdBy: this.tenantContext.getRequiredUserId(),
      dto,
    });
  }

  async createForCompany(
    input: CreateBankReconciliationForCompanyInput,
  ): Promise<bank_reconciliations> {
    const { companyId, createdBy, dto } = input;

    const account = await this.bankAccountsRepository.findById(
      dto.bank_account_id,
      companyId,
    );

    if (!account) {
      throw new NotFoundException('Bank account not found');
    }

    const referenceMonth = new Date(dto.reference_month);
    const existing = await this.repository.findByMonth(
      dto.bank_account_id,
      referenceMonth,
    );

    if (existing) {
      throw new BadRequestException(
        'Reconciliation for this month already exists',
      );
    }

    // Calculate totals for the month
    const startDate = new Date(
      referenceMonth.getFullYear(),
      referenceMonth.getMonth(),
      1,
    );
    const endDate = new Date(
      referenceMonth.getFullYear(),
      referenceMonth.getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    const totals = await this.repository.getMonthlyTotals(
      dto.bank_account_id,
      startDate,
      endDate,
    );

    const reconciledBalance =
      dto.opening_balance + totals.total_receipts - totals.total_payments;

    const difference = dto.bank_statement_balance - reconciledBalance;

    const id = this.snowflake.generate();

    return this.repository.create({
      id,
      bank_accounts: { connect: { id: dto.bank_account_id } },
      reference_month: referenceMonth,
      opening_balance: dto.opening_balance,
      closing_balance: dto.closing_balance,
      bank_statement_balance: dto.bank_statement_balance,
      total_receipts: totals.total_receipts,
      total_payments: totals.total_payments,
      pending_receipts: totals.pending_receipts,
      pending_payments: totals.pending_payments,
      reconciled_balance: reconciledBalance,
      difference,
      status: 'pending',
      notes: dto.notes,
      reconciled_by: createdBy,
    });
  }

  async findAll(bankAccountId?: string): Promise<bank_reconciliations[]> {
    const companyId = this.tenantContext.getCompanyId();
    return this.repository.findAll(companyId, bankAccountId);
  }

  async findOne(id: string): Promise<bank_reconciliations> {
    const reconciliation = await this.repository.findById(id);

    if (!reconciliation) {
      throw new NotFoundException('Reconciliation not found');
    }

    return reconciliation;
  }

  async update(
    id: string,
    dto: UpdateBankReconciliationDto,
  ): Promise<bank_reconciliations> {
    const reconciliation = await this.findOne(id);

    if (reconciliation.status === 'completed') {
      throw new BadRequestException('Cannot update completed reconciliation');
    }

    // If balance changed, recalculate difference
    let difference = Number(reconciliation.difference);
    if (dto.bank_statement_balance !== undefined) {
      difference =
        dto.bank_statement_balance - Number(reconciliation.reconciled_balance);
    }

    return this.repository.update(id, {
      ...(dto.closing_balance !== undefined && {
        closing_balance: dto.closing_balance,
      }),
      ...(dto.bank_statement_balance !== undefined && {
        bank_statement_balance: dto.bank_statement_balance,
        difference,
      }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.status && { status: dto.status }),
      ...(dto.status === 'completed' && { reconciled_at: new Date() }),
    });
  }

  async complete(id: string): Promise<bank_reconciliations> {
    const reconciliation = await this.findOne(id);

    if (Number(reconciliation.difference) !== 0) {
      throw new BadRequestException(
        'Cannot complete reconciliation with difference',
      );
    }

    return this.repository.update(id, {
      status: 'completed',
      reconciled_at: new Date(),
    });
  }
}
