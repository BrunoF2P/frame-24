import { apiClient, ApiPayload } from './api-config';

export const UsersService = {
  // GET /v1/users (Listar Usuários)
  getAll: async () => {
    const response = await apiClient.get('/v1/users');
    return response.data;
  },

  // GET /v1/users/:id (Buscar por ID)
  getById: async (employeeId: string) => {
    const response = await apiClient.get(`/v1/users/${employeeId}`);
    return response.data;
  },

  // POST /v1/users (Criar Usuário)
  create: async (data: ApiPayload) => {
    const response = await apiClient.post('/v1/users', data);
    return response.data;
  },

  // PUT /v1/users/:employee_id (Atualizar Usuário)
  update: async (employeeId: string, data: ApiPayload) => {
    const response = await apiClient.put(`/v1/users/${employeeId}`, data);
    return response.data;
  },

  // DELETE /v1/users/:id (Deletar Usuário)
  delete: async (employeeId: string) => {
    return apiClient.delete(`/v1/users/${employeeId}`);
  },
};
