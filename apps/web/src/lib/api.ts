import axios from "axios";
import { getSession } from "next-auth/react";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/v1`
    : "http://localhost:4000/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para adicionar token
api.interceptors.request.use(async (config) => {
  const session = await getSession();
  const keycloakToken = session?.accessToken;
  if (keycloakToken) {
    config.headers.Authorization = `Bearer ${keycloakToken}`;
  }
  return config;
});
