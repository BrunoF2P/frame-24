import { apiClient } from './api-config';

export interface CompanyInfo {
  id: string;
  corporate_name: string;
  trade_name: string;
  cnpj: string;
  tenant_slug: string;
  email: string;
  phone: string;
  active: boolean;
  [key: string]: unknown;
}

export const SettingsService = {
  async getCompanyInfo() {
    const response = await apiClient.get('/v1/users');
    return response.data;
  },

  async getComplexes() {
    const response = await apiClient.get('/v1/cinema-complexes');
    return (response.data ?? []) as unknown[];
  },

  async getPaymentMethods() {
    const response = await apiClient.get('/v1/pos-payment-methods');
    return (response.data ?? []) as unknown[];
  },
};
