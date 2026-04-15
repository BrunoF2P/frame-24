"use client";

import { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { resolveCustomerProfile } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { usePathname } from "next/navigation";

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
  hasSession: boolean;
  login: (_token: string, _user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  const firstSegment = pathname?.split("/").filter(Boolean)[0]?.trim() || null;
  const reservedSegments = new Set([
    "cidade",
    "perfil",
    "busca",
    "checkout",
    "pedido",
    "cinema",
  ]);
  const tenantSlug =
    firstSegment && !reservedSegments.has(firstSegment) ? firstSegment : null;

  useEffect(() => {
    if (isPending) {
      return;
    }

    if (!session) {
      setProfile(null);
      setIsProfileLoading(false);
      return;
    }

    let isMounted = true;

    const loadProfile = async () => {
      setIsProfileLoading(true);
      try {
        const data = (await resolveCustomerProfile(
          tenantSlug,
        )) as CustomerProfile | null;
        if (isMounted) {
          setProfile(data);
        }
      } catch {
        if (isMounted) {
          setProfile(null);
        }
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
  }, [isPending, session, tenantSlug]);

  const logout = () => {
    void authClient.signOut();
    setProfile(null);
    setIsProfileLoading(false);
  };

  const user: User | null = profile
    ? {
        id: profile.id,
        email: profile.email,
        name: profile.full_name,
        company_id: profile.company_id,
        tenant_slug: profile.tenant_slug,
        loyalty_level: profile.loyalty_level,
        accumulated_points: profile.accumulated_points,
      }
    : session?.user?.id
      ? {
          id: session.user.id,
          email: session.user.email ?? undefined,
          name: session.user.name ?? undefined,
        }
    : null;

  // In customer-facing web app, authenticated means: valid session + active customer profile.
  const isAuthenticated = !!profile;
  const hasSession = !!session;
  const isLoading = isPending || (!!session && isProfileLoading);

  return (
    <AuthContext.Provider
      value={{
        user,
        token: null,
        isLoading,
        hasSession,
        login: () => {
          // Login is now handled directly via Better Auth client.
        },
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
