import { apiClient, ApiPayload } from './api-config';

type SupplierPayload = ApiPayload;

export const SuppliersService = {
  async getAll() {
    const response = await apiClient.get('/v1/suppliers');
    return (response.data ?? []) as unknown[];
  },

  async getDistributors() {
    const response = await apiClient.get('/v1/suppliers', {
      params: { distributors: true },
    });
    return (response.data ?? []) as unknown[];
  },

  async getTypes() {
    const response = await apiClient.get('/v1/suppliers/types');
    return (response.data ?? []) as unknown[];
  },

  async getById(id: string) {
    const response = await apiClient.get(`/v1/suppliers/${id}`);
    return response.data as unknown;
  },

  async create(data: SupplierPayload) {
    return await apiClient.post('/v1/suppliers', data);
  },

  async update(id: string, data: SupplierPayload) {
    return await apiClient.put(`/v1/suppliers/${id}`, data);
  },

  async delete(id: string) {
    return await apiClient.delete(`/v1/suppliers/${id}`);
  },
};
