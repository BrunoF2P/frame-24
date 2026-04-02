import {
  PublicApi,
  CustomerAuthApi,
  CustomerApi,
  AuthApi,
  Configuration,
} from "@repo/api-types";
import axios from "axios";
import { getSession } from "next-auth/react";

// Criar instância do axios SEM /v1 para os clientes OpenAPI
// (eles já adicionam /v1 automaticamente)
const apiInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para adicionar token JWT
apiInstance.interceptors.request.use(async (config) => {
  const session = await getSession();
  const token = session?.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Configuração da API
const apiConfig = new Configuration({
  basePath: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
});

// Instâncias dos clientes da API usando a instância do axios configurada
export const publicApi = new PublicApi(apiConfig, undefined, apiInstance);
export const customerAuthApi = new CustomerAuthApi(
  apiConfig,
  undefined,
  apiInstance,
);
export const customerApi = new CustomerApi(apiConfig, undefined, apiInstance);
export const authApi = new AuthApi(apiConfig, undefined, apiInstance);

// Helper para extrair dados da resposta
export const unwrapResponse = <T>(response: { data: T }): T => response.data;
