import { TenantContextService } from 'src/common/services/tenant-context.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { PositionReportsService } from './position-reports.service';

describe('PositionReportsService', () => {
  let service: PositionReportsService;
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

    service = new PositionReportsService(prisma, tenantContext);
  });

  it('should build customer position with overdue and payment history metrics', async () => {
    const overdueDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

    prisma.accounts_receivable.findMany
      .mockResolvedValueOnce([
        {
          id: 'ar-1',
          customer_id: 'cust-1',
          document_number: 'AR1',
          due_date: overdueDate,
          original_amount: 100,
          remaining_amount: 100,
          status: 'overdue',
          transactions: [
            { transaction_date: new Date('2026-03-01'), amount: 20 },
          ],
        },
      ] as never)
      .mockResolvedValueOnce([
        {
          customer_id: 'cust-1',
          original_amount: 100,
        },
      ] as never);

    const result = await service.getCustomerPosition({} as any);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        customer_id: 'cust-1',
        total_open_amount: 100,
        total_overdue_amount: 100,
        paid_titles_count: 1,
      }),
    );
    expect(result[0].payment_history).toHaveLength(1);
  });

  it('should build supplier position with upcoming payment windows', async () => {
    const in5Days = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const in20Days = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);

    prisma.accounts_payable.findMany.mockResolvedValue([
      {
        id: 'ap-1',
        supplier_id: 'sup-1',
        document_number: 'AP1',
        due_date: in5Days,
        original_amount: 100,
        remaining_amount: 100,
        status: 'pending',
        transactions: [],
      },
      {
        id: 'ap-2',
        supplier_id: 'sup-1',
        document_number: 'AP2',
        due_date: in20Days,
        original_amount: 200,
        remaining_amount: 200,
        status: 'pending',
        transactions: [],
      },
    ] as never);

    const result = await service.getSupplierPosition({} as any);

    expect(result).toHaveLength(1);
    expect(result[0].supplier_id).toBe('sup-1');
    expect(result[0].upcoming_7days_amount).toBeGreaterThan(0);
    expect(result[0].upcoming_15days_amount).toBeGreaterThanOrEqual(
      result[0].upcoming_7days_amount,
    );
    expect(result[0].upcoming_30days_amount).toBe(300);
    expect(result[0].upcoming_payments.length).toBeGreaterThan(0);
  });

  it('should return null on getCustomerPositionById when customer has no open titles', async () => {
    prisma.accounts_receivable.findMany
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never);

    const result = await service.getCustomerPositionById('cust-missing');

    expect(result).toBeNull();
  });

  it('should apply min filters and keep sorting by highest open amount', async () => {
    const overdueDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);

    prisma.accounts_receivable.findMany
      .mockResolvedValueOnce([
        {
          id: 'ar-a1',
          customer_id: 'cust-a',
          document_number: 'A1',
          due_date: overdueDate,
          original_amount: 500,
          remaining_amount: 500,
          status: 'overdue',
          transactions: [],
        },
        {
          id: 'ar-b1',
          customer_id: 'cust-b',
          document_number: 'B1',
          due_date: overdueDate,
          original_amount: 200,
          remaining_amount: 200,
          status: 'overdue',
          transactions: [],
        },
      ] as never)
      .mockResolvedValueOnce([
        { customer_id: 'cust-a', original_amount: 100 },
        { customer_id: 'cust-b', original_amount: 100 },
      ] as never);

    const result = await service.getCustomerPosition({
      min_open_amount: 300,
      min_overdue_days: 1,
    } as any);

    expect(result).toHaveLength(1);
    expect(result[0].customer_id).toBe('cust-a');
  });

  it('should cap supplier payment history to last 10 items and sort upcoming by nearest due', async () => {
    const now = Date.now();
    const transactions = Array.from({ length: 12 }, (_, i) => ({
      transaction_date: new Date(now - i * 24 * 60 * 60 * 1000),
      amount: i + 1,
    }));

    prisma.accounts_payable.findMany.mockResolvedValue([
      {
        id: 'ap-near',
        supplier_id: 'sup-2',
        document_number: 'AP-NEAR',
        due_date: new Date(now + 2 * 24 * 60 * 60 * 1000),
        original_amount: 100,
        remaining_amount: 100,
        status: 'pending',
        transactions,
      },
      {
        id: 'ap-far',
        supplier_id: 'sup-2',
        document_number: 'AP-FAR',
        due_date: new Date(now + 10 * 24 * 60 * 60 * 1000),
        original_amount: 200,
        remaining_amount: 200,
        status: 'pending',
        transactions: [],
      },
    ] as never);

    const result = await service.getSupplierPosition({} as any);

    expect(result).toHaveLength(1);
    expect(result[0].payment_history).toHaveLength(10);
    expect(result[0].upcoming_payments[0].document_number).toBe('AP-NEAR');
  });
});
