import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  auth: {
    authControllerVerifyEmailV1: ({ verifyEmailDto }: { verifyEmailDto: { token: string } }) =>
      apiClient.post('/v1/auth/verify-email', verifyEmailDto),
  },
};
