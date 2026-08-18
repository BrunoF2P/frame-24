"use client";

import { apiInstance } from "./api-client";

export const authClient = {
  async signInEmail(email: string, password: string) {
    const response = await apiInstance.post("/api/auth/sign-in/email", {
      email,
      password,
    });
    return response.data;
  },

  async signOut() {
    await apiInstance.post("/api/auth/sign-out");
  },

  async getSession() {
    try {
      const response = await apiInstance.get("/v1/auth/session");
      return response.data;
    } catch {
      return null;
    }
  },
};
