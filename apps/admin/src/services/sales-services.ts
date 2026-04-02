import { apiConfig } from "./api-config";
import axios from "axios";
import { ProductsApi, ProductCategoriesApi } from "@repo/api-types";
import { getSession } from "next-auth/react";

const productsApi = new ProductsApi(apiConfig);
const categoriesApi = new ProductCategoriesApi(apiConfig);

type GenericObject = Record<string, unknown>;

async function getAuthHeaders() {
  const session = await getSession();
  const keycloakToken = session?.accessToken;

  return {
    Authorization: keycloakToken ? `Bearer ${keycloakToken}` : "",
  };
}

export const SalesService = {
  // --- Tipos de Ingresso ---
  async getTicketTypes() {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${apiConfig.basePath}/v1/ticket-types`, {
      headers,
    });
    return (response.data ?? []) as unknown[];
  },

  async getTicketTypeById(id: string) {
    const headers = await getAuthHeaders();
    const response = await axios.get(
      `${apiConfig.basePath}/v1/ticket-types/${id}`,
      {
        headers,
      },
    );
    return response.data;
  },

  async createTicketType(data: GenericObject) {
    const headers = await getAuthHeaders();
    return await axios.post(
      `${apiConfig.basePath}/v1/ticket-types`,
      data,
      {
        headers,
      },
    );
  },

  async updateTicketType(id: string, data: GenericObject) {
    const headers = await getAuthHeaders();
    return await axios.put(
      `${apiConfig.basePath}/v1/ticket-types/${id}`,
      data,
      {
        headers,
      },
    );
  },

  async deleteTicketType(id: string) {
    const headers = await getAuthHeaders();
    return await axios.delete(`${apiConfig.basePath}/v1/ticket-types/${id}`, {
      headers,
    });
  },

  // --- Produtos (Bombonière) ---
  async getProducts() {
    const response = await productsApi.productsControllerFindAllV1({
      active: "true",
    });
    return response.data;
  },

  async createProduct(data: GenericObject) {
    const headers = await getAuthHeaders();
    return await axios.post(
      `${apiConfig.basePath}/v1/products`,
      {
        ...data,
        active: true,
      },
      {
        headers,
      },
    );
  },

  async getProductCategories() {
    const response = await categoriesApi.productCategoriesControllerFindAllV1();
    return response.data;
  },
};
