import { UserManagementApi, CreateUserDto } from "@repo/api-types";
import { apiConfig } from "./api-config";

const api = new UserManagementApi(apiConfig);

export const UsersService = {
  // GET /v1/users (Listar Usuários)
  getAll: async () => {
    const response = await api.userManagementControllerListUsersV1({});
    return response.data;
  },

  // GET /v1/users/:id (Buscar por ID)
  getById: async (employeeId: string) => {
    // CORREÇÃO: Usar o nome da propriedade esperado: { employeeId: employeeId }
    const response = await api.userManagementControllerGetUserV1({
      employeeId: employeeId,
    });
    return response.data;
  },

  // POST /v1/users (Criar Usuário)
  create: async (data: CreateUserDto) => {
    const response = await api.userManagementControllerCreateUserV1({
      createUserDto: data,
    });
    return response.data;
  },
  // DELETE /v1/users/:id (Deletar Usuário)
  delete: async (employeeId: string) => {
    // CORREÇÃO: Usar o nome da propriedade esperado: { employeeId: employeeId }
    return api.userManagementControllerDeleteUserV1({ employeeId: employeeId });
  },
};
