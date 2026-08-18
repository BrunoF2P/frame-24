import { apiClient } from './api-config';

export const AuthService = {
  login: async (email: string, password: string) => {
    return apiClient.post('/v1/auth/login', {
      email,
      password,
    });
  },
  forgotPassword: async (email: string) => {
    return apiClient.post('/v1/auth/forgot-password', { email });
  },
};
