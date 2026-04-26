"use client";

import { use, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { extractErrorMessage } from "@/lib/error-utils";
import { authClient } from "@/lib/auth-client";
import { resolveCustomerProfile } from "@/lib/api-client";
import { toTenantAuthEmail } from "@/lib/tenant-auth-email";

export default function LoginPage({
  params,
}: {
  params: Promise<{ tenant_slug: string }>;
}) {
  const { tenant_slug } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || `/${tenant_slug}/perfil`;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await authClient.signIn.email({
        email: toTenantAuthEmail(tenant_slug, email),
        password,
      });

      if (result.error) {
        setError(result.error.message || "Falha ao autenticar. Verifique seus dados.");
        return;
      }

      const profile = await resolveCustomerProfile(tenant_slug);
      if (!profile) {
        const activateUrl = `/${tenant_slug}/auth/register?intent=activate&returnUrl=${encodeURIComponent(returnUrl)}`;
        router.push(activateUrl);
        return;
      }

      router.push(returnUrl);
    } catch (err: unknown) {
      setError(
        extractErrorMessage(err, "Erro ao realizar login. Tente novamente."),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-black" />
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-red-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />

      <div className="relative w-full max-w-md">
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-3xl font-bold text-white text-center mb-2">
            Bem-vindo de volta
          </h1>
          <p className="text-zinc-400 text-center mb-8">
            Entre para continuar sua experiência
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="tenant-login-email"
                className="block text-sm font-medium text-zinc-300 mb-2"
              >
                Email
              </label>
              <input
                id="tenant-login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label
                htmlFor="tenant-login-password"
                className="block text-sm font-medium text-zinc-300 mb-2"
              >
                Senha
              </label>
              <input
                id="tenant-login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-red-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <p className="mt-8 text-center text-zinc-400 text-sm">
            Ainda não tem conta?{" "}
            <Link
              href={`/${tenant_slug}/auth/register`}
              className="text-red-400 hover:text-red-300 font-medium transition-colors"
            >
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
