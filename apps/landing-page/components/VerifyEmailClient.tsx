"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import type { AxiosError } from "axios";

type VerifyState = "loading" | "success" | "error";

type ApiErrorPayload = {
  message?: string | string[];
};

export default function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [state, setState] = useState<VerifyState>(token ? "loading" : "error");
  const [message, setMessage] = useState(
    token ? "" : "Token de verificação não encontrado.",
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    async function verifyEmail(validToken: string) {
      try {
        await api.auth.authControllerVerifyEmailV1({
          verifyEmailDto: { token: validToken },
        });

        setState("success");
        setMessage("Email verificado com sucesso!");

        setTimeout(() => {
          router.push("http://localhost:3002/login");
        }, 3000);
      } catch (error: unknown) {
        console.error("Erro ao verificar email:", error);

        const axiosError = error as AxiosError<ApiErrorPayload>;
        const payloadMessage = axiosError.response?.data?.message;

        const errorMessage =
          (Array.isArray(payloadMessage)
            ? payloadMessage[0]
            : payloadMessage) ?? "Token inválido ou expirado.";

        setState("error");
        setMessage(errorMessage);
      }
    }

    void verifyEmail(token);
  }, [token, router]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
        {state === "loading" && (
          <>
            <div className="text-6xl mb-4 animate-spin">⏳</div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Verificando seu email...
            </h1>
            <p className="text-gray-400">Aguarde um momento</p>
          </>
        )}

        {state === "success" && (
          <>
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-green-400 mb-2">
              Email Verificado!
            </h1>
            <p className="text-gray-300 mb-4">{message}</p>
            <p className="text-sm text-gray-400">
              Redirecionando para o login...
            </p>
          </>
        )}

        {state === "error" && (
          <>
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-red-400 mb-2">
              Erro na Verificação
            </h1>
            <p className="text-gray-300 mb-6">{message}</p>
            <div className="space-y-3">
              <Link
                href="/register-tenant"
                className="block px-6 py-3 bg-red-700 hover:bg-red-600 text-white rounded-lg font-semibold transition"
              >
                Cadastrar Novamente
              </Link>
              <Link
                href="/"
                className="block px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition"
              >
                Voltar para Home
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
