import { PrismaService } from 'src/prisma/prisma.service';
import { AgingAutomationService } from './aging-automation.service';

describe('AgingAutomationService', () => {
  let service: AgingAutomationService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      accounts_receivable: {
        updateMany: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      accounts_payable: {
        updateMany: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    } as any;

    service = new AgingAutomationService(prisma);
  });

  it('should update overdue status for pending and partially paid titles', async () => {
    prisma.accounts_receivable.updateMany.mockResolvedValue({
      count: 2,
    } as never);
    prisma.accounts_payable.updateMany.mockResolvedValue({ count: 3 } as never);

    await service.updateOverdueStatus();

    expect(prisma.accounts_receivable.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ['pending', 'partially_paid'] },
        }),
        data: { status: 'overdue' },
      }),
    );
    expect(prisma.accounts_payable.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ['pending', 'partially_paid'] },
        }),
        data: { status: 'overdue' },
      }),
    );
  });

  it('should calculate daily penalties and interest for overdue receivables/payables', async () => {
    const overdueDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

    prisma.accounts_receivable.findMany.mockResolvedValue([
      {
        id: 'ar-1',
        due_date: overdueDate,
        original_amount: 1000,
        penalty_amount: 0,
        interest_amount: 0,
      },
    ] as never);

    prisma.accounts_payable.findMany.mockResolvedValue([
      {
        id: 'ap-1',
        due_date: overdueDate,
        original_amount: 500,
        penalty_amount: 0,
        interest_amount: 0,
      },
    ] as never);

    prisma.accounts_receivable.update.mockResolvedValue({
      id: 'ar-1',
    } as never);
    prisma.accounts_payable.update.mockResolvedValue({ id: 'ap-1' } as never);

    await service.calculatePenalties();

    expect(prisma.accounts_receivable.update).toHaveBeenCalledWith({
      where: { id: 'ar-1' },
      data: expect.objectContaining({
        penalty_amount: 20,
      }),
    });
    expect(prisma.accounts_payable.update).toHaveBeenCalledWith({
      where: { id: 'ap-1' },
      data: expect.objectContaining({
        penalty_amount: 10,
      }),
    });
  });

  it('should keep existing penalty and only refresh accumulated interest', async () => {
    const overdueDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

    prisma.accounts_receivable.findMany.mockResolvedValue([
      {
        id: 'ar-2',
        due_date: overdueDate,
        original_amount: 1000,
        penalty_amount: 30,
        interest_amount: 1,
      },
    ] as never);
    prisma.accounts_payable.findMany.mockResolvedValue([] as never);
    prisma.accounts_receivable.update.mockResolvedValue({
      id: 'ar-2',
    } as never);

    await service.calculatePenalties();

    expect(prisma.accounts_receivable.update).toHaveBeenCalledWith({
      where: { id: 'ar-2' },
      data: expect.objectContaining({
        penalty_amount: 30,
      }),
    });
  });

  it('should swallow errors on overdue status update job (non-breaking cron)', async () => {
    prisma.accounts_receivable.updateMany.mockRejectedValue(
      new Error('db down'),
    );

    await expect(service.updateOverdueStatus()).resolves.toBeUndefined();
  });

  it('should swallow errors on penalties job (non-breaking cron)', async () => {
    prisma.accounts_receivable.findMany.mockRejectedValue(new Error('db down'));

    await expect(service.calculatePenalties()).resolves.toBeUndefined();
  });

  it('should execute forceUpdate calling both automation steps', async () => {
    const overdueSpy = jest
      .spyOn(service, 'updateOverdueStatus')
      .mockResolvedValue(undefined);
    const penaltiesSpy = jest
      .spyOn(service, 'calculatePenalties')
      .mockResolvedValue(undefined);

    await service.forceUpdate();

    expect(overdueSpy).toHaveBeenCalled();
    expect(penaltiesSpy).toHaveBeenCalled();
  });
});
