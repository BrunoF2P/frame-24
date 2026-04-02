import { AuthApi } from "@repo/api-types";
import { apiConfig } from "./api-config";

const api = new AuthApi(apiConfig);

export const AuthService = {
  login: async (email: string, password: string) => {
    return api.authControllerLoginV1({
      loginDto: {
        email,
        password,
      },
    });
  },
  forgotPassword: async (email: string) => {
    return api.authControllerForgotPasswordV1({
      forgotPasswordDto: { email },
    });
  },
};
