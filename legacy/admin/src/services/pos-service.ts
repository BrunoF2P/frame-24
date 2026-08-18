import { apiClient, ApiPayload } from './api-config';

type GenericObject = Record<string, unknown>;

export interface PosSession {
  id: string;
  company_id: string;
  cinema_complex_id: string;
  operator_id: string;
  status: string;
  status_name?: string;
  session_number: string;
  opening_amount: number;
  cash_withdrawn: number;
  cash_counted: number | null;
  difference: number | null;
  total_sales_amount: number;
  total_sales_count: number;
  total_refunds_amount: number;
  total_refunds_count: number;
  total_discounts_amount: number;
  total_received_amount: number;
  total_change_given: number;
  opened_at: string;
  closed_at: string | null;
  closing_notes: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface PosTransaction {
  id: string;
  pos_session_id: string;
  sale_id: string | null;
  company_id: string;
  cinema_complex_id: string;
  operator_id: string;
  transaction_type: string;
  payment_method: string;
  payment_method_name?: string;
  amount: number;
  change_amount: number;
  description: string | null;
  reference_type: string | null;
  reference_id: string | null;
  performed_at: string;
  created_at: string;
}

export interface PosPaymentMethod {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  requires_change: boolean | null;
  auto_settle: boolean;
  settlement_days: number | null;
  active: boolean | null;
}

export const PosService = {
  async getPosSessions(filters?: {
    status?: string;
    cinema_complex_id?: string;
  }) {
    const response = await apiClient.get('/v1/pos-sessions', {
      params: filters,
    });
    return (response.data ?? []) as PosSession[];
  },

  async getPosSessionById(id: string) {
    const response = await apiClient.get(`/v1/pos-sessions/${id}`);
    return response.data as PosSession;
  },

  async openPosSession(data: { cinema_complex_id: string; opening_amount?: number }) {
    const response = await apiClient.post('/v1/pos-sessions', data);
    return response.data as PosSession;
  },

  async closePosSession(
    id: string,
    data: {
      cash_counted?: number;
      closing_notes?: string;
    },
  ) {
    const response = await apiClient.put(`/v1/pos-sessions/${id}`, {
      status: 'closed',
      ...data,
    });
    return response.data as PosSession;
  },

  async updatePosSession(id: string, data: GenericObject) {
    const response = await apiClient.put(`/v1/pos-sessions/${id}`, data);
    return response.data as PosSession;
  },

  async getPosSessionStatuses() {
    const response = await apiClient.get('/v1/pos-sessions/statuses');
    return (response.data ?? []) as ApiPayload[];
  },

  async getPosPaymentMethods() {
    const response = await apiClient.get('/v1/pos-payment-methods');
    return (response.data ?? []) as PosPaymentMethod[];
  },

  async createPosTransaction(data: {
    pos_session_id: string;
    transaction_type: string;
    payment_method: string;
    amount: number;
    change_amount?: number;
    description?: string;
    reference_type?: string;
    reference_id?: string;
  }) {
    const response = await apiClient.post('/v1/pos-transactions', data);
    return response.data as PosTransaction;
  },

  async getPosTransactionsBySession(pos_session_id: string) {
    const response = await apiClient.get(
      `/v1/pos-transactions/session/${pos_session_id}`,
    );
    return (response.data ?? []) as PosTransaction[];
  },

  async getPosTransactionById(id: string) {
    const response = await apiClient.get(`/v1/pos-transactions/${id}`);
    return response.data as PosTransaction;
  },
};
