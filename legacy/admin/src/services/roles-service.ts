import { apiClient, ApiPayload } from './api-config';

export const RolesService = {
  // READ: Lista todos os Perfis de Acesso
  getAll: async () => {
    const response = await apiClient.get('/v1/roles');
    return response.data;
  },

  // GET /v1/permissions: Lista todas as permissões (Necessário para a tela New Role)
  getPermissions: async () => {
    const response = await apiClient.get('/v1/permissions');
    return response.data;
  },

  // CREATE: Cria novo perfil
  create: async (data: ApiPayload) => {
    return await apiClient.post('/v1/roles', data);
  },

  // GET /v1/roles/:id
  getById: async (id: string) => {
    const response = await apiClient.get(`/v1/roles/${id}`);
    return response.data;
  },

  // UPDATE /v1/roles/:id
  update: async (id: string, data: ApiPayload) => {
    return await apiClient.put(`/v1/roles/${id}`, data);
  },

  // DELETE /v1/roles/:id
  delete: async (id: string) => {
    return await apiClient.delete(`/v1/roles/${id}`);
  },
};
