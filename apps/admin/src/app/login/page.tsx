"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    const authError = currentUrl.searchParams.get("error");
    const callbackUrl = currentUrl.searchParams.get("callbackUrl") ?? "/";

    if (authError) {
      setLoginError(
        "Nao foi possivel iniciar sua autenticacao agora. Tente novamente em instantes.",
      );
      setShowFallback(true);
      return;
    }

    const fallbackTimer = window.setTimeout(() => {
      setShowFallback(true);
    }, 4000);

    void signIn("authentik", { callbackUrl }).catch(() => {
      setLoginError(
        "Nao foi possivel conectar com a central de acesso. Verifique o Authentik e tente novamente.",
      );
      setShowFallback(true);
    });

    return () => {
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  const handleRetry = () => {
    const currentUrl = new URL(window.location.href);
    const callbackUrl = currentUrl.searchParams.get("callbackUrl") ?? "/";

    setLoginError(null);
    setShowFallback(false);
    void signIn("authentik", { callbackUrl }).catch(() => {
      setLoginError(
        "Nao foi possivel conectar com a central de acesso. Verifique o Authentik e tente novamente.",
      );
      setShowFallback(true);
    });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-8 border border-border bg-zinc-900/50 p-8 rounded-xl backdrop-blur-sm">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Frame24 <span className="text-accent-red">Admin</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Redirecionando para a central de acesso segura
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex w-full items-center justify-center rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm font-semibold text-white">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Redirecionando...
          </div>

          {loginError ? (
            <p className="text-center text-sm text-red-300">{loginError}</p>
          ) : null}

          {showFallback ? (
            <button
              onClick={handleRetry}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-semibold text-white transition-colors hover:border-red-500/50 hover:bg-zinc-700"
            >
              Tentar novamente
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
