"use client";

import { useState, use, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { signIn } from "next-auth/react";

export default function LoginPage({
  params,
}: {
  params: Promise<{ tenant_slug: string }>;
}) {
  const { tenant_slug } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const returnUrl = searchParams.get("returnUrl") || `/${tenant_slug}`;

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push(returnUrl);
    }
  }, [authLoading, isAuthenticated, router, returnUrl]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  // Don't render login form if already authenticated
  if (isAuthenticated) {
    return null;
  }

  const handleSignIn = async () => {
    setIsLoading(true);
    setError("");

    try {
      await signIn("authentik", {
        callbackUrl: returnUrl,
      });
    } catch {
      setError("Não foi possível iniciar o login. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-black" />
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-red-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />

      <div className="relative w-full max-w-md">
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Bem-vindo de volta
            </h1>
            <p className="text-zinc-400">Acesse sua conta para continuar</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <p className="text-sm text-zinc-400 text-center">
              Você será redirecionado para a central de acesso segura do Frame24.
            </p>

            <button
              type="button"
              onClick={handleSignIn}
              disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold rounded-lg shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLoading ? "Redirecionando..." : "Entrar"}
            </button>
          </div>

          <div className="mt-8 text-center text-zinc-400 text-sm">
            Não tem uma conta?{" "}
            <Link
              href={`/${tenant_slug}/auth/register`}
              className="text-white font-semibold hover:text-red-400 transition-colors"
            >
              Cadastre-se gratuitamente
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
