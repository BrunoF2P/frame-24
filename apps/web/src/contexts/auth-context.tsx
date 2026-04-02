"use client";

import { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { buildOidcLogoutUrl } from "@/lib/oidc-logout";
import { customerApi, unwrapResponse } from "@/lib/api-client";

interface User {
  id: string;
  email?: string;
  name?: string;
  company_id?: string;
  tenant_slug?: string;
  loyalty_level?: string;
  accumulated_points?: number;
}

type CustomerProfile = {
  id: string;
  email?: string;
  full_name?: string;
  loyalty_level?: string;
  accumulated_points?: number;
  company_id?: string;
  tenant_slug?: string;
};

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || !session?.accessToken || !session.user?.id) {
      setProfile(null);
      setIsProfileLoading(false);
      return;
    }

    let isMounted = true;

    const loadProfile = async () => {
      setIsProfileLoading(true);

      try {
        const response = await customerApi.customerControllerGetProfileV1();
        const data = unwrapResponse(response) as unknown as CustomerProfile;

        if (isMounted) {
          setProfile(data);
        }
      } catch (error) {
        if (isMounted) {
          setProfile(null);
        }
        console.error("Erro ao carregar perfil do cliente:", error);
      } finally {
        if (isMounted) {
          setIsProfileLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [session?.accessToken, session?.user?.id, status]);

  const user: User | null = session?.user?.id
    ? {
        id: profile?.id ?? session.user.id,
        email: profile?.email ?? session.user?.email ?? undefined,
        name: profile?.full_name ?? session.user?.name ?? undefined,
        company_id: profile?.company_id,
        tenant_slug: profile?.tenant_slug,
        loyalty_level: profile?.loyalty_level,
        accumulated_points: profile?.accumulated_points,
      }
    : null;

  const token = session?.accessToken ?? null;
  const isLoading = status === "loading" || (status === "authenticated" && isProfileLoading);
  const isAuthenticated = status === "authenticated";

  const login = (_newToken: string, _newUser: User) => {
    // Login is handled by Auth.js redirects to the configured OIDC provider.
    void _newToken;
    void _newUser;
  };

  const logout = async () => {
    const firstPathSegment =
      typeof window === "undefined"
        ? ""
        : window.location.pathname.split("/").filter(Boolean)[0] ?? "";
    const postLogoutRedirectUrl =
      typeof window === "undefined"
        ? "/"
        : `${window.location.origin}/${firstPathSegment}`;
    const logoutParams = {
      idToken: session?.idToken,
      postLogoutRedirectUrl,
    };

    await signOut({ redirect: false });
    window.location.assign(buildOidcLogoutUrl(logoutParams));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
