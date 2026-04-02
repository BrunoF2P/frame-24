import { Injectable } from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { Prisma } from '@repo/db';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CustomerPositionQueryDto,
  SupplierPositionQueryDto,
} from '../dto/position-report-query.dto';

type CustomerTitle = {
  id: string;
  document_number: string;
  due_date: Date;
  days_overdue: number;
  original_amount: number;
  remaining_amount: number;
  status: string;
};

type SupplierTitle = {
  id: string;
  document_number: string;
  due_date: Date;
  days_until_due: number;
  original_amount: number;
  remaining_amount: number;
  status: string;
};

type PaymentHistoryItem = {
  date: Date;
  amount: number;
  document_number: string;
};

type UpcomingPayment = {
  id: string;
  document_number: string;
  due_date: Date;
  amount: number;
  days_until_due: number;
};

type CustomerPositionItem = {
  customer_id: string;
  titles: CustomerTitle[];
  total_open_amount: number;
  total_overdue_amount: number;
  overdue_days_max: number;
  open_titles_count: number;
  payment_history: PaymentHistoryItem[];
  paid_titles_count: number;
  avg_ticket: number;
  default_rate: number;
};

type SupplierPositionItem = {
  supplier_id: string;
  titles: SupplierTitle[];
  total_open_amount: number;
  total_overdue_amount: number;
  upcoming_7days_amount: number;
  upcoming_15days_amount: number;
  upcoming_30days_amount: number;
  open_titles_count: number;
  payment_history: PaymentHistoryItem[];
  upcoming_payments: UpcomingPayment[];
  avg_title_amount: number;
};

@Injectable()
export class PositionReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async getCustomerPosition(query: CustomerPositionQueryDto) {
    return this.getCustomerPositionForCompany(
      this.tenantContext.getCompanyId(),
      query,
    );
  }

  async getCustomerPositionForCompany(
    companyId: string,
    query: CustomerPositionQueryDto,
  ) {
    const whereClause: Prisma.accounts_receivableWhereInput = {
      company_id: companyId,
      status: { in: ['pending', 'partially_paid', 'overdue'] },
    };

    if (query.customer_id) {
      whereClause.customer_id = query.customer_id;
    }

    if (query.cinema_complex_id) {
      whereClause.cinema_complex_id = query.cinema_complex_id;
    }

    // Buscar todos os títulos em aberto
    const openTitles = await this.prisma.accounts_receivable.findMany({
      where: whereClause,
      include: {
        transactions: {
          orderBy: { transaction_date: 'desc' },
        },
      },
    });

    // Agrupar por cliente
    const customerMap = new Map<string, CustomerPositionItem>();

    for (const title of openTitles) {
      const customerId = title.customer_id || 'unknown';

      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, {
          customer_id: customerId,
          titles: [],
          total_open_amount: 0,
          total_overdue_amount: 0,
          overdue_days_max: 0,
          open_titles_count: 0,
          payment_history: [],
          paid_titles_count: 0,
          avg_ticket: 0,
          default_rate: 0,
        });
      }

      const customer = customerMap.get(customerId)!;
      const remaining = Number(title.remaining_amount);
      customer.total_open_amount += remaining;
      customer.open_titles_count++;

      // Verificar se está vencido
      const today = new Date();
      const dueDate = new Date(title.due_date);
      const daysOverdue = Math.max(
        0,
        Math.floor(
          (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
        ),
      );

      if (daysOverdue > 0) {
        customer.total_overdue_amount += remaining;
        customer.overdue_days_max = Math.max(
          customer.overdue_days_max,
          daysOverdue,
        );
      }

      customer.titles.push({
        id: title.id,
        document_number: title.document_number,
        due_date: title.due_date,
        days_overdue: daysOverdue,
        original_amount: Number(title.original_amount),
        remaining_amount: remaining,
        status: title.status,
      });

      // Adicionar histórico de transações
      if (title.transactions && title.transactions.length > 0) {
        customer.payment_history.push(
          ...title.transactions.map((transaction) => ({
            date: transaction.transaction_date,
            amount: Number(transaction.amount),
            document_number: title.document_number,
          })),
        );
      }
    }

    // Buscar títulos pagos de TODOS os clientes em uma única query (batch)
    const customerIds = [...customerMap.keys()].filter(
      (id) => id !== 'unknown',
    );

    const allPaidTitles = await this.prisma.accounts_receivable.findMany({
      where: {
        company_id: companyId,
        customer_id: { in: customerIds },
        status: 'paid',
      },
      select: {
        customer_id: true,
        original_amount: true,
      },
    });

    // Agrupar títulos pagos por cliente em memória
    const paidByCustomer = new Map<string, { count: number; total: number }>();
    for (const t of allPaidTitles) {
      const cid = t.customer_id ?? 'unknown';
      const entry = paidByCustomer.get(cid) ?? { count: 0, total: 0 };
      entry.count++;
      entry.total += Number(t.original_amount);
      paidByCustomer.set(cid, entry);
    }

    for (const [customerId, customer] of customerMap.entries()) {
      if (customerId === 'unknown') continue;

      const paid = paidByCustomer.get(customerId) ?? { count: 0, total: 0 };
      const totalTitles = customer.open_titles_count + paid.count;
      const totalAmount = customer.total_open_amount + paid.total;

      customer.paid_titles_count = paid.count;
      customer.avg_ticket = totalTitles > 0 ? totalAmount / totalTitles : 0;
      customer.default_rate =
        totalTitles > 0 ? (customer.open_titles_count / totalTitles) * 100 : 0;

      // Ordenar transações por data
      customer.payment_history.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      customer.payment_history = customer.payment_history.slice(0, 10); // Últimas 10
    }

    // Converter map para array e aplicar filtros
    let results = Array.from(customerMap.values());

    if (query.min_overdue_days) {
      results = results.filter(
        (customer) => customer.overdue_days_max >= query.min_overdue_days!,
      );
    }

    if (query.min_open_amount) {
      results = results.filter(
        (customer) => customer.total_open_amount >= query.min_open_amount!,
      );
    }

    // Ordenar por maior valor em aberto
    results.sort((a, b) => b.total_open_amount - a.total_open_amount);

    return results;
  }

  async getCustomerPositionById(customerId: string) {
    return this.getCustomerPositionByIdForCompany(
      this.tenantContext.getCompanyId(),
      customerId,
    );
  }

  async getCustomerPositionByIdForCompany(
    companyId: string,
    customerId: string,
  ) {
    const result = await this.getCustomerPositionForCompany(companyId, {
      customer_id: customerId,
    });
    return result[0] || null;
  }

  async getSupplierPosition(query: SupplierPositionQueryDto) {
    return this.getSupplierPositionForCompany(
      this.tenantContext.getCompanyId(),
      query,
    );
  }

  async getSupplierPositionForCompany(
    companyId: string,
    query: SupplierPositionQueryDto,
  ) {
    const whereClause: Prisma.accounts_payableWhereInput = {
      company_id: companyId,
      status: { in: ['pending', 'partially_paid', 'overdue'] },
    };

    if (query.supplier_id) {
      whereClause.supplier_id = query.supplier_id;
    }

    if (query.cinema_complex_id) {
      whereClause.cinema_complex_id = query.cinema_complex_id;
    }

    const openTitles = await this.prisma.accounts_payable.findMany({
      where: whereClause,
      include: {
        transactions: {
          orderBy: { transaction_date: 'desc' },
        },
      },
    });

    const supplierMap = new Map<string, SupplierPositionItem>();
    const today = new Date();

    for (const title of openTitles) {
      const supplierId = title.supplier_id || 'unknown';

      if (!supplierMap.has(supplierId)) {
        supplierMap.set(supplierId, {
          supplier_id: supplierId,
          titles: [],
          total_open_amount: 0,
          total_overdue_amount: 0,
          upcoming_7days_amount: 0,
          upcoming_15days_amount: 0,
          upcoming_30days_amount: 0,
          open_titles_count: 0,
          payment_history: [],
          upcoming_payments: [],
          avg_title_amount: 0,
        });
      }

      const supplier = supplierMap.get(supplierId)!;
      const remaining = Number(title.remaining_amount);
      supplier.total_open_amount += remaining;
      supplier.open_titles_count++;

      const dueDate = new Date(title.due_date);
      const daysUntilDue = Math.floor(
        (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Verificar se está vencido
      if (daysUntilDue < 0) {
        supplier.total_overdue_amount += remaining;
      }

      // Calcular vencimentos próximos
      if (daysUntilDue >= 0 && daysUntilDue <= 7) {
        supplier.upcoming_7days_amount += remaining;
        supplier.upcoming_payments.push({
          id: title.id,
          document_number: title.document_number,
          due_date: title.due_date,
          amount: remaining,
          days_until_due: daysUntilDue,
        });
      }
      if (daysUntilDue >= 0 && daysUntilDue <= 15) {
        supplier.upcoming_15days_amount += remaining;
      }
      if (daysUntilDue >= 0 && daysUntilDue <= 30) {
        supplier.upcoming_30days_amount += remaining;
      }

      supplier.titles.push({
        id: title.id,
        document_number: title.document_number,
        due_date: title.due_date,
        days_until_due: daysUntilDue,
        original_amount: Number(title.original_amount),
        remaining_amount: remaining,
        status: title.status,
      });

      if (title.transactions && title.transactions.length > 0) {
        supplier.payment_history.push(
          ...title.transactions.map((transaction) => ({
            date: transaction.transaction_date,
            amount: Number(transaction.amount),
            document_number: title.document_number,
          })),
        );
      }
    }

    // Calcular valores médios
    for (const supplier of supplierMap.values()) {
      supplier.avg_title_amount =
        supplier.open_titles_count > 0
          ? supplier.total_open_amount / supplier.open_titles_count
          : 0;

      supplier.payment_history.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      supplier.payment_history = supplier.payment_history.slice(0, 10);

      supplier.upcoming_payments.sort(
        (a, b) => a.days_until_due - b.days_until_due,
      );
    }

    const results = Array.from(supplierMap.values());
    results.sort((a, b) => b.total_open_amount - a.total_open_amount);

    return results;
  }

  async getSupplierPositionById(supplierId: string) {
    return this.getSupplierPositionByIdForCompany(
      this.tenantContext.getCompanyId(),
      supplierId,
    );
  }

  async getSupplierPositionByIdForCompany(
    companyId: string,
    supplierId: string,
  ) {
    const result = await this.getSupplierPositionForCompany(companyId, {
      supplier_id: supplierId,
      upcoming_days: 30,
    });
    return result[0] || null;
  }
}
