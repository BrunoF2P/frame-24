declare module "next-auth" {
  interface Session {
    accessToken?: string;
    idToken?: string;
  }

  interface User {
    id?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    idToken?: string;
    sessionId?: string;
    oidcSubject?: string;
    oidcExpiresAt?: number;
  }
}

export {};
