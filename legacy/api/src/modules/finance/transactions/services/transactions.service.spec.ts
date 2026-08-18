import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { AccountsReceivableRepository } from 'src/modules/finance/accounts-receivable/repositories/accounts-receivable.repository';
import { AccountsPayableRepository } from 'src/modules/finance/accounts-payable/repositories/accounts-payable.repository';
import { CashFlowEntriesService } from 'src/modules/finance/cash-flow/services/cash-flow-entries.service';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { TransactionsService } from './transactions.service';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _key: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

describe('TransactionsService', () => {
  let service: TransactionsService;
  let prisma: any;
  let snowflake: jest.Mocked<SnowflakeService>;
  let receivablesRepository: jest.Mocked<AccountsReceivableRepository>;
  let payablesRepository: jest.Mocked<AccountsPayableRepository>;
  let cashFlowService: jest.Mocked<CashFlowEntriesService>;
  let tenantContext: jest.Mocked<TenantContextService>;

  beforeEach(() => {
    prisma = {
      receivable_transactions: {
        create: jest.fn(),
      },
      payable_transactions: {
        create: jest.fn(),
      },
    } as any;

    snowflake = {
      generate: jest.fn(),
    } as unknown as jest.Mocked<SnowflakeService>;

    receivablesRepository = {
      findById: jest.fn(),
      updateStatus: jest.fn(),
    } as unknown as jest.Mocked<AccountsReceivableRepository>;

    payablesRepository = {
      findById: jest.fn(),
      updateStatus: jest.fn(),
    } as unknown as jest.Mocked<AccountsPayableRepository>;

    cashFlowService = {
      createForCompany: jest.fn(),
    } as unknown as jest.Mocked<CashFlowEntriesService>;

    tenantContext = {
      getCompanyId: jest.fn(),
      getRequiredUserId: jest.fn(),
    } as unknown as jest.Mocked<TenantContextService>;

    snowflake.generate.mockReturnValue('tx-1');

    service = new TransactionsService(
      prisma,
      snowflake,
      receivablesRepository,
      payablesRepository,
      cashFlowService,
      tenantContext,
    );
  });

  it('should throw when receivable account is not found', async () => {
    receivablesRepository.findById.mockResolvedValue(null);

    await expect(
      service.settleReceivableForCompany({
        companyId: 'company-1',
        userId: 'user-1',
        dto: {
          account_receivable_id: 'ar-404',
          transaction_date: '2026-03-20',
          amount: 50,
          bank_account_id: 'bank-1',
          payment_method: 'pix',
        } as any,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should block receivable settlement for paid account', async () => {
    receivablesRepository.findById.mockResolvedValue({
      id: 'ar-1',
      status: 'paid',
    } as never);

    await expect(
      service.settleReceivableForCompany({
        companyId: 'company-1',
        userId: 'user-1',
        dto: {
          account_receivable_id: 'ar-1',
          transaction_date: '2026-03-20',
          amount: 10,
          bank_account_id: 'bank-1',
          payment_method: 'cash',
        } as any,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should settle receivable partially and create cash flow receipt', async () => {
    receivablesRepository.findById.mockResolvedValue({
      id: 'ar-1',
      status: 'pending',
      paid_amount: 20,
      remaining_amount: 100,
      cinema_complex_id: 'complex-1',
      competence_date: new Date('2026-03-01'),
      document_number: 'AR-001',
      customer_id: 'customer-1',
    } as never);
    prisma.receivable_transactions.create.mockResolvedValue({
      id: 'tx-1',
    } as never);
    receivablesRepository.updateStatus.mockResolvedValue({
      id: 'ar-1',
    } as never);
    cashFlowService.createForCompany.mockResolvedValue({ id: 'cf-1' } as never);

    const result = await service.settleReceivableForCompany({
      companyId: 'company-1',
      userId: 'user-1',
      dto: {
        account_receivable_id: 'ar-1',
        transaction_date: '2026-03-20',
        amount: 30,
        bank_account_id: 'bank-1',
        payment_method: 'pix',
      } as any,
    });

    expect(receivablesRepository.updateStatus).toHaveBeenCalledWith(
      'ar-1',
      'partially_paid',
      50,
      70,
    );
    expect(cashFlowService.createForCompany).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company-1',
        createdBy: 'user-1',
        dto: expect.objectContaining({
          entry_type: 'receipt',
          category: 'receivable_settlement',
          amount: 30,
          source_type: 'ACCOUNT_RECEIVABLE',
        }),
      }),
    );
    expect(result).toEqual({ id: 'tx-1' });
  });

  it('should settle payable fully and mark account as paid', async () => {
    payablesRepository.findById.mockResolvedValue({
      id: 'ap-1',
      status: 'pending',
      paid_amount: 40,
      remaining_amount: 60,
      cinema_complex_id: 'complex-1',
      competence_date: new Date('2026-03-01'),
      document_number: 'AP-001',
      supplier_id: 'supplier-1',
    } as never);
    prisma.payable_transactions.create.mockResolvedValue({
      id: 'tx-2',
    } as never);
    payablesRepository.updateStatus.mockResolvedValue({ id: 'ap-1' } as never);
    cashFlowService.createForCompany.mockResolvedValue({ id: 'cf-2' } as never);

    const result = await service.settlePayableForCompany({
      companyId: 'company-1',
      userId: 'user-1',
      dto: {
        account_payable_id: 'ap-1',
        transaction_date: '2026-03-20',
        amount: 60,
        bank_account_id: 'bank-1',
        payment_method: 'ted',
      } as any,
    });

    expect(payablesRepository.updateStatus).toHaveBeenCalledWith(
      'ap-1',
      'paid',
      100,
      0,
    );
    expect(cashFlowService.createForCompany).toHaveBeenCalledWith(
      expect.objectContaining({
        dto: expect.objectContaining({
          entry_type: 'payment',
          category: 'payable_settlement',
          source_type: 'ACCOUNT_PAYABLE',
        }),
      }),
    );
    expect(result).toEqual({ id: 'tx-2' });
  });
});
