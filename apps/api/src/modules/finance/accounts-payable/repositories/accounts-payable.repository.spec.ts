import { PrismaService } from 'src/prisma/prisma.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { AccountsPayableRepository } from './accounts-payable.repository';

describe('AccountsPayableRepository', () => {
  let repository: AccountsPayableRepository;
  let prisma: any;
  let snowflake: jest.Mocked<SnowflakeService>;

  beforeEach(() => {
    prisma = {
      accounts_payable: {
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

    snowflake.generate.mockReturnValue('ap-1');
    repository = new AccountsPayableRepository(prisma, snowflake);
  });

  it('should create payable computing remaining amount', async () => {
    prisma.accounts_payable.create.mockResolvedValue({ id: 'ap-1' } as never);

    const dto = {
      cinema_complex_id: 'complex-1',
      issue_date: '2026-03-10',
      due_date: '2026-03-30',
      competence_date: '2026-03-01',
      original_amount: 200,
      interest_amount: 10,
      penalty_amount: 5,
      discount_amount: 15,
    };

    const result = await repository.create('company-1', dto as any);

    expect(prisma.accounts_payable.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: 'ap-1',
        company_id: 'company-1',
        remaining_amount: 200,
        status: 'pending',
      }),
    });
    expect(result).toEqual({ id: 'ap-1' });
  });

  it('should return paginated list from findAll', async () => {
    prisma.accounts_payable.count.mockResolvedValue(5 as never);
    prisma.accounts_payable.findMany.mockResolvedValue([
      { id: 'ap-1' },
      { id: 'ap-2' },
    ] as never);

    const result = await repository.findAll('company-1', {
      page: 2,
      per_page: 2,
    } as any);

    expect(prisma.accounts_payable.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { company_id: 'company-1' },
        skip: 2,
        take: 2,
      }),
    );
    expect(result.meta).toEqual({
      total: 5,
      page: 2,
      per_page: 2,
      last_page: 3,
    });
  });

  it('should find payable by id and company', async () => {
    prisma.accounts_payable.findFirst.mockResolvedValue({
      id: 'ap-1',
    } as never);

    const result = await repository.findById('ap-1', 'company-1');

    expect(prisma.accounts_payable.findFirst).toHaveBeenCalledWith({
      where: { id: 'ap-1', company_id: 'company-1' },
      include: { transactions: true },
    });
    expect(result).toEqual({ id: 'ap-1' });
  });

  it('should update payable data', async () => {
    prisma.accounts_payable.update.mockResolvedValue({ id: 'ap-1' } as never);

    const result = await repository.update('ap-1', {
      description: 'updated',
      due_date: '2026-04-10',
    } as any);

    expect(prisma.accounts_payable.update).toHaveBeenCalledWith({
      where: { id: 'ap-1' },
      data: expect.objectContaining({
        description: 'updated',
        due_date: new Date('2026-04-10'),
      }),
    });
    expect(result).toEqual({ id: 'ap-1' });
  });

  it('should update status and amounts', async () => {
    prisma.accounts_payable.update.mockResolvedValue({ id: 'ap-1' } as never);

    const result = await repository.updateStatus('ap-1', 'partial', 50, 150);

    expect(prisma.accounts_payable.update).toHaveBeenCalledWith({
      where: { id: 'ap-1' },
      data: { status: 'partial', paid_amount: 50, remaining_amount: 150 },
    });
    expect(result).toEqual({ id: 'ap-1' });
  });
});
