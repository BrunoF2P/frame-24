import { apiClient } from './api-config';
import type { PosSession, PosTransaction } from './pos-service';

export interface Sale {
  id: string;
  company_id: string;
  cinema_complex_id: string;
  customer_id: string | null;
  status: string;
  total_amount: number;
  discount_amount: number;
  final_amount: number;
  payment_method: string | null;
  created_at: string;
  [key: string]: unknown;
}

export interface CashFlowSummary {
  total_inflow: number;
  total_outflow: number;
  net_balance: number;
}

export const FinanceService = {
  async getPosSessions(filters?: { status?: string; cinema_complex_id?: string }) {
    const response = await apiClient.get('/v1/pos-sessions', { params: filters });
    return (response.data ?? []) as PosSession[];
  },

  async getPosTransactionsBySession(pos_session_id: string) {
    const response = await apiClient.get(`/v1/pos-transactions/session/${pos_session_id}`);
    return (response.data ?? []) as PosTransaction[];
  },

  async getSales(filters?: {
    cinema_complex_id?: string;
    start_date?: string;
    end_date?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const response = await apiClient.get('/v1/sales', { params: filters });
    return (response.data ?? []) as Sale[];
  },

  async getCashFlowSummary(filters?: { start_date?: string; end_date?: string }) {
    const response = await apiClient.get('/v1/finance/cash-flow/reports/summary', {
      params: filters,
    });
    return (response.data ?? {}) as CashFlowSummary;
  },

  async getIncomeStatement(month: string) {
    const response = await apiClient.get('/v1/finance/reports/income-statement', {
      params: { month },
    });
    return response.data;
  },
};
