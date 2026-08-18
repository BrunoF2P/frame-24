import { apiClient } from './api-config';

type GenericObject = Record<string, unknown>;

export const SalesService = {
  // --- Tipos de Ingresso ---
  async getTicketTypes() {
    const response = await apiClient.get('/v1/ticket-types');
    return (response.data ?? []) as unknown[];
  },

  async getTicketTypeById(id: string) {
    const response = await apiClient.get(`/v1/ticket-types/${id}`);
    return response.data;
  },

  async createTicketType(data: GenericObject) {
    return await apiClient.post('/v1/ticket-types', data);
  },

  async updateTicketType(id: string, data: GenericObject) {
    return await apiClient.put(`/v1/ticket-types/${id}`, data);
  },

  async deleteTicketType(id: string) {
    return await apiClient.delete(`/v1/ticket-types/${id}`);
  },

  // --- Produtos (Bombonière) ---
  async getProducts() {
    const response = await apiClient.get('/v1/products', {
      params: { active: 'true' },
    });
    return response.data;
  },

  async createProduct(data: GenericObject) {
    return await apiClient.post('/v1/products', {
      ...data,
      active: true,
    });
  },

  async getProductCategories() {
    const response = await apiClient.get('/v1/product-categories');
    return response.data;
  },
};
