import axios from "axios";
import { apiConfig } from "./api-config";

export const SuppliersService = {
  // Busca todos e filtra apenas os que são distribuidores de filmes
  getDistributors: async () => {
    const response = await axios.get(`${apiConfig.basePath}/v1/suppliers`, {
      params: { distributors: true },
      headers: apiConfig.baseOptions?.headers,
    });

    return (response.data ?? []) as unknown[];
  },
};
