import { TenantContextService } from 'src/common/services/tenant-context.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AgingReportsService } from './aging-reports.service';

describe('AgingReportsService', () => {
  let service: AgingReportsService;
  let prisma: any;
  let tenantContext: jest.Mocked<TenantContextService>;

  beforeEach(() => {
    prisma = {
      accounts_receivable: {
        findMany: jest.fn(),
      },
      accounts_payable: {
        findMany: jest.fn(),
      },
    } as any;

    tenantContext = {
      getCompanyId: jest.fn(),
    } as unknown as jest.Mocked<TenantContextService>;

    tenantContext.getCompanyId.mockReturnValue('company-1');
    service = new AgingReportsService(prisma, tenantContext);
  });

  it('should classify receivables into overdue, due today and coming buckets', async () => {
    prisma.accounts_receivable.findMany.mockResolvedValue([
      {
        id: 'r1',
        document_number: 'R1',
        customer_id: 'c1',
        issue_date: new Date('2026-02-01'),
        due_date: new Date('2026-02-20'),
        original_amount: 100,
        remaining_amount: 100,
        status: 'overdue',
      },
      {
        id: 'r2',
        document_number: 'R2',
        customer_id: 'c1',
        issue_date: new Date('2026-02-01'),
        due_date: new Date('2026-03-01'),
        original_amount: 200,
        remaining_amount: 200,
        status: 'pending',
      },
      {
        id: 'r3',
        document_number: 'R3',
        customer_id: 'c1',
        issue_date: new Date('2026-02-01'),
        due_date: new Date('2026-03-10'),
        original_amount: 300,
        remaining_amount: 300,
        status: 'pending',
      },
    ] as never);

    const result = await service.getReceivablesAging({
      base_date: '2026-03-01',
    } as any);

    expect(result.total_amount).toBe(600);
    expect(result.buckets.overdue_1_30.count).toBe(1);
    expect(result.buckets.due_today.count).toBe(1);
    expect(result.buckets.coming_1_30.count).toBe(1);
  });

  it('should classify payables and include filters by cinema_complex_id', async () => {
    prisma.accounts_payable.findMany.mockResolvedValue([
      {
        id: 'p1',
        document_number: 'P1',
        supplier_id: 's1',
        issue_date: new Date('2026-02-01'),
        due_date: new Date('2026-06-20'),
        original_amount: 400,
        remaining_amount: 400,
        status: 'pending',
      },
    ] as never);

    const result = await service.getPayablesAging({
      base_date: '2026-03-01',
      cinema_complex_id: 'complex-1',
    } as any);

    expect(prisma.accounts_payable.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          company_id: 'company-1',
          cinema_complex_id: 'complex-1',
        }),
      }),
    );
    expect(result.buckets.coming_90_plus.count).toBe(1);
  });

  it('should classify boundary days into correct buckets (30/31/60/61/90)', async () => {
    prisma.accounts_receivable.findMany.mockResolvedValue([
      {
        id: 'r30',
        document_number: 'R30',
        customer_id: 'c1',
        issue_date: new Date('2026-02-01'),
        due_date: new Date('2026-03-31'),
        original_amount: 10,
        remaining_amount: 10,
        status: 'pending',
      },
      {
        id: 'r31',
        document_number: 'R31',
        customer_id: 'c1',
        issue_date: new Date('2026-02-01'),
        due_date: new Date('2026-04-01'),
        original_amount: 20,
        remaining_amount: 20,
        status: 'pending',
      },
      {
        id: 'r60',
        document_number: 'R60',
        customer_id: 'c1',
        issue_date: new Date('2026-02-01'),
        due_date: new Date('2026-04-30'),
        original_amount: 30,
        remaining_amount: 30,
        status: 'pending',
      },
      {
        id: 'r61',
        document_number: 'R61',
        customer_id: 'c1',
        issue_date: new Date('2026-02-01'),
        due_date: new Date('2026-05-01'),
        original_amount: 40,
        remaining_amount: 40,
        status: 'pending',
      },
      {
        id: 'r90',
        document_number: 'R90',
        customer_id: 'c1',
        issue_date: new Date('2026-02-01'),
        due_date: new Date('2026-05-30'),
        original_amount: 50,
        remaining_amount: 50,
        status: 'pending',
      },
      {
        id: 'o31',
        document_number: 'O31',
        customer_id: 'c1',
        issue_date: new Date('2026-02-01'),
        due_date: new Date('2026-01-29'),
        original_amount: 60,
        remaining_amount: 60,
        status: 'overdue',
      },
    ] as never);

    const result = await service.getReceivablesAging({
      base_date: '2026-03-01',
    } as any);

    expect(result.buckets.coming_1_30.count).toBe(1);
    expect(result.buckets.coming_31_60.count).toBe(2);
    expect(result.buckets.coming_61_90.count).toBe(2);
    expect(result.buckets.overdue_31_60.count).toBe(1);
  });

  it('should query receivables scoped by company and optional complex', async () => {
    prisma.accounts_receivable.findMany.mockResolvedValue([] as never);

    await service.getReceivablesAging({
      cinema_complex_id: 'complex-9',
    } as any);

    expect(prisma.accounts_receivable.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          company_id: 'company-1',
          cinema_complex_id: 'complex-9',
        }),
      }),
    );
  });
});
