import { PrismaService } from 'src/prisma/prisma.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { AccountsReceivableRepository } from './accounts-receivable.repository';

describe('AccountsReceivableRepository', () => {
  let repository: AccountsReceivableRepository;
  let prisma: any;
  let snowflake: jest.Mocked<SnowflakeService>;

  beforeEach(() => {
    prisma = {
      accounts_receivable: {
        create: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    } as any;

    snowflake = {
      generate: jest.fn(),
    } as unknown as jest.Mocked<SnowflakeService>;

    snowflake.generate.mockReturnValue('ar-1');

    repository = new AccountsReceivableRepository(prisma, snowflake);
  });

  it('should create receivable computing remaining amount', async () => {
    prisma.accounts_receivable.create.mockResolvedValue({
      id: 'ar-1',
    } as never);

    const dto = {
      cinema_complex_id: 'complex-1',
      issue_date: '2026-03-10',
      due_date: '2026-03-30',
      competence_date: '2026-03-01',
      original_amount: 100,
      interest_amount: 10,
      penalty_amount: 5,
      discount_amount: 3,
    };

    const result = await repository.create('company-1', dto as any);

    expect(prisma.accounts_receivable.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: 'ar-1',
        company_id: 'company-1',
        remaining_amount: 112,
        status: 'pending',
      }),
    });
    expect(result).toEqual({ id: 'ar-1' });
  });

  it('should return paginated findAll response', async () => {
    prisma.accounts_receivable.count.mockResolvedValue(3 as never);
    prisma.accounts_receivable.findMany.mockResolvedValue([
      { id: 'ar-1' },
      { id: 'ar-2' },
    ] as never);

    const result = await repository.findAll('company-1', {
      page: 1,
      per_page: 2,
    } as any);

    expect(prisma.accounts_receivable.count).toHaveBeenCalled();
    expect(prisma.accounts_receivable.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { company_id: 'company-1' },
        skip: 0,
        take: 2,
      }),
    );
    expect(result.meta).toEqual({
      total: 3,
      page: 1,
      per_page: 2,
      last_page: 2,
    });
  });

  it('should find one by id and company with transactions', async () => {
    prisma.accounts_receivable.findFirst.mockResolvedValue({
      id: 'ar-1',
    } as never);

    const result = await repository.findById('ar-1', 'company-1');

    expect(prisma.accounts_receivable.findFirst).toHaveBeenCalledWith({
      where: { id: 'ar-1', company_id: 'company-1' },
      include: { transactions: true },
    });
    expect(result).toEqual({ id: 'ar-1' });
  });

  it('should update receivable fields', async () => {
    prisma.accounts_receivable.update.mockResolvedValue({
      id: 'ar-1',
    } as never);

    const result = await repository.update('ar-1', {
      description: 'updated',
      due_date: '2026-04-10',
    } as any);

    expect(prisma.accounts_receivable.update).toHaveBeenCalledWith({
      where: { id: 'ar-1' },
      data: expect.objectContaining({
        description: 'updated',
        due_date: new Date('2026-04-10'),
      }),
    });
    expect(result).toEqual({ id: 'ar-1' });
  });

  it('should update status and amounts', async () => {
    prisma.accounts_receivable.update.mockResolvedValue({
      id: 'ar-1',
    } as never);

    const result = await repository.updateStatus('ar-1', 'partial', 20, 80);

    expect(prisma.accounts_receivable.update).toHaveBeenCalledWith({
      where: { id: 'ar-1' },
      data: { status: 'partial', paid_amount: 20, remaining_amount: 80 },
    });
    expect(result).toEqual({ id: 'ar-1' });
  });
});
