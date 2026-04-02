import { PrismaService } from 'src/prisma/prisma.service';
import { BankReconciliationRepository } from './bank-reconciliation.repository';

describe('BankReconciliationRepository', () => {
  let repository: BankReconciliationRepository;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      bank_reconciliations: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      cash_flow_entries: {
        aggregate: jest.fn(),
      },
    } as any;

    repository = new BankReconciliationRepository(prisma);
  });

  it('should list reconciliations filtered by company and optional bank account', async () => {
    prisma.bank_reconciliations.findMany.mockResolvedValue([
      { id: 'recon-1' },
    ] as never);

    const result = await repository.findAll('company-1', 'bank-1');

    expect(prisma.bank_reconciliations.findMany).toHaveBeenCalledWith({
      where: {
        bank_accounts: { company_id: 'company-1' },
        bank_account_id: 'bank-1',
      },
      include: {
        bank_accounts: {
          select: {
            bank_name: true,
            account_number: true,
          },
        },
      },
      orderBy: { reference_month: 'desc' },
    });
    expect(result).toEqual([{ id: 'recon-1' }]);
  });

  it('should find month reconciliation by compound key', async () => {
    prisma.bank_reconciliations.findUnique.mockResolvedValue({
      id: 'recon-1',
    } as never);

    const month = new Date('2026-03-01');
    const result = await repository.findByMonth('bank-1', month);

    expect(prisma.bank_reconciliations.findUnique).toHaveBeenCalledWith({
      where: {
        bank_account_id_reference_month: {
          bank_account_id: 'bank-1',
          reference_month: month,
        },
      },
    });
    expect(result).toEqual({ id: 'recon-1' });
  });

  it('should compute monthly totals from aggregate queries', async () => {
    prisma.cash_flow_entries.aggregate
      .mockResolvedValueOnce({ _sum: { amount: 300 } } as never)
      .mockResolvedValueOnce({ _sum: { amount: 180 } } as never)
      .mockResolvedValueOnce({ _sum: { amount: 40 } } as never)
      .mockResolvedValueOnce({ _sum: { amount: 25 } } as never);

    const totals = await repository.getMonthlyTotals(
      'bank-1',
      new Date('2026-03-01'),
      new Date('2026-03-31'),
    );

    expect(totals).toEqual({
      total_receipts: 300,
      total_payments: 180,
      pending_receipts: 40,
      pending_payments: 25,
    });
    expect(prisma.cash_flow_entries.aggregate).toHaveBeenCalledTimes(4);
  });
});
