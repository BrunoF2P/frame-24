import NextAuth from "next-auth";

const oidcProvider = {
  id: "authentik",
  name: "Frame24",
  type: "oidc",
  issuer:
    process.env.AUTH_OIDC_ISSUER ??
    process.env.AUTH_KEYCLOAK_ISSUER ??
    "http://localhost:9080/application/o/frame24-app/",
  clientId:
    process.env.AUTH_OIDC_ID ?? process.env.AUTH_KEYCLOAK_ID ?? "frame24-app",
  clientSecret:
    process.env.AUTH_OIDC_SECRET ??
    process.env.AUTH_KEYCLOAK_SECRET ??
    "frame24-app-dev-secret",
} as const;

const authConfig = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? "frame24-landing-dev-auth-secret-change-me",
  providers: [oidcProvider],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken =
        typeof token.accessToken === "string" ? token.accessToken : undefined;
      session.idToken =
        typeof token.idToken === "string" ? token.idToken : undefined;
      return session;
    },
  },
});

export const { handlers } = authConfig;
