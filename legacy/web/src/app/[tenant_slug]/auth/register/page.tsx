"use client";

import { useState, use, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import axios from "axios";
import { useCompany } from "@/hooks/use-company";
import { extractErrorMessage } from "@/lib/error-utils";
import { authClient } from "@/lib/auth-client";

interface CompanySummary {
  id?: unknown;
}

function isValidCPF(cpf: string): boolean {
  const numbers = cpf.replace(/\D/g, "");
  if (numbers.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(numbers)) return false;

  const digitAt = (i: number): number => parseInt(numbers[i] ?? "0", 10) || 0;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += digitAt(i) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== digitAt(9)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += digitAt(i) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== digitAt(10)) return false;

  return true;
}

function validateFullName(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length < 5) return "Nome deve ter pelo menos 5 caracteres";
  if (trimmed.split(/\s+/).length < 2) return "Informe nome e sobrenome";
  return undefined;
}

function validateCPFField(value: string): string | undefined {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length !== 11) return "CPF deve ter 11 dígitos";
  if (!isValidCPF(value)) return "CPF inválido";
  return undefined;
}

function validatePhone(value: string): string | undefined {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length < 10) return "Telefone deve ter pelo menos 10 dígitos";
  return undefined;
}

function validateEmail(value: string): string | undefined {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Email inválido";
  return undefined;
}

function validatePassword(value: string): string | undefined {
  if (value.length < 8) return "Mínimo de 8 caracteres";
  if (!/[A-Z]/.test(value)) return "Deve conter letra maiúscula";
  if (!/[a-z]/.test(value)) return "Deve conter letra minúscula";
  if (!/[0-9]/.test(value)) return "Deve conter número";
  if (!/[^A-Za-z0-9]/.test(value)) return "Deve conter caractere especial";
  return undefined;
}

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  barClass: string;
  textClass: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1)
    return {
      score,
      label: "Fraca",
      barClass: "bg-red-500",
      textClass: "text-red-400",
    };
  if (score <= 3)
    return {
      score,
      label: "Média",
      barClass: "bg-yellow-500",
      textClass: "text-yellow-400",
    };
  return {
    score,
    label: "Forte",
    barClass: "bg-emerald-500",
    textClass: "text-emerald-400",
  };
}

interface FormErrors {
  full_name?: string;
  cpf?: string;
  phone?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterPage({
  params,
}: {
  params: Promise<{ tenant_slug: string }>;
}) {
  const { tenant_slug } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, hasSession, isLoading: authLoading } = useAuth();
  const { data: company } = useCompany(tenant_slug);
  const isActivationIntent = searchParams.get("intent") === "activate";
  const returnUrl = searchParams.get("returnUrl") || `/${tenant_slug}`;
  // Only use URL intent to decide activation flow, not session presence alone
  // (admin session cookies on shared domain shouldn't hijack the full register flow)
  const isActivationFlow = isActivationIntent;

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    cpf: "",
    birthdate: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const companyData = (company as CompanySummary | undefined) ?? undefined;
  const companyId =
    typeof companyData?.id === "string" ? companyData.id : undefined;

  const errors: FormErrors = useMemo(() => {
    const errs: FormErrors = {};
    if (formData.full_name) errs.full_name = validateFullName(formData.full_name);
    if (formData.cpf) errs.cpf = validateCPFField(formData.cpf);
    if (formData.phone) errs.phone = validatePhone(formData.phone);
    if (!isActivationFlow && !isActivationIntent) {
      if (formData.email) errs.email = validateEmail(formData.email);
      if (formData.password) errs.password = validatePassword(formData.password);
      if (formData.confirmPassword)
        errs.confirmPassword =
          formData.confirmPassword !== formData.password
            ? "Senhas não coincidem"
            : undefined;
    }
    return errs;
  }, [formData, isActivationFlow, isActivationIntent]);

  const passwordStrength = useMemo(() => {
    if (!formData.password) return null;
    return getPasswordStrength(formData.password);
  }, [formData.password]);

  const hasErrors = Object.values(errors).some(Boolean);

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
  };

  useEffect(() => {
    // Pre-filling from session is now handled by the API or omitted if we don't have a client-side session object
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push(`/${tenant_slug}`);
    }
  }, [authLoading, isAuthenticated, router, tenant_slug]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  // Don't render register form if already authenticated
  if (isAuthenticated) {
    return null;
  }

  // Mask functions
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{5})(\d)/, "$1-$2");
    }
    return value.slice(0, 15); // Max length with mask: (00) 00000-0000
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    // Apply masks based on field name
    if (name === "phone") {
      formattedValue = formatPhone(value);
    }

    setFormData({ ...formData, [name]: formattedValue });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (
      !isActivationFlow &&
      !isActivationIntent &&
      formData.password !== formData.confirmPassword
    ) {
      setError("As senhas não coincidem");
      setIsLoading(false);
      return;
    }

    if (!isActivationFlow && !isActivationIntent) {
      const pw = formData.password;
      if (pw.length < 8 || !/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/\d/.test(pw)) {
        setError("Senha deve ter no mínimo 8 caracteres com maiúscula, minúscula e número");
        setIsLoading(false);
        return;
      }
    }

    if (!companyId) {
      setError(
        "Não foi possível identificar a empresa deste link. Recarregue a página e tente novamente.",
      );
      setIsLoading(false);
      return;
    }

    try {
      if (isActivationFlow || isActivationIntent) {
        await axios.post(
          `/v1/customer/auth/activate`,
          {
            full_name: formData.full_name,
            phone: formData.phone.replace(/\D/g, ""),
            birth_date: formData.birthdate || undefined,
            company_id: companyId,
            accepts_marketing: true,
            accepts_email: true,
            accepts_sms: true,
          },
          { withCredentials: true },
        );
      } else {
        await axios.post(`/v1/customer/auth/register`, {
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone.replace(/\D/g, ""),
          birth_date: formData.birthdate || undefined,
          password: formData.password,
          company_id: companyId,
          tenant_slug,
          accepts_marketing: true,
          accepts_email: true,
          accepts_sms: true,
        });
      }

      setSuccessMessage(
        isActivationFlow || isActivationIntent
          ? "Validacao concluida! Seu acesso neste cinema foi ativado."
          : "Cadastro concluído! Agora faça login na central de acesso do Frame24 para acessar sua conta.",
      );

      setTimeout(() => {
        if (isActivationFlow || isActivationIntent) {
          router.push(returnUrl);
        } else {
          router.push(`/${tenant_slug}/auth/login`);
        }
      }, 1200);
    } catch (err: unknown) {
      const errorMessage = extractErrorMessage(
        err,
        "Erro ao realizar cadastro. Tente novamente.",
      );
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-black" />
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-red-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />

      <div className="relative w-full max-w-lg">
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              {isActivationFlow || isActivationIntent
                ? "Ative seu acesso"
                : "Crie sua conta"}
            </h1>
            <p className="text-zinc-400">
              {isActivationFlow || isActivationIntent
                ? "Sua conta ja existe. Precisamos confirmar seus dados para liberar seu acesso neste cinema."
                : "Junte-se a nós para uma experiência exclusiva"}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-300 text-sm text-center">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Nome Completo
              </label>
              <input
                name="full_name"
                type="text"
                value={formData.full_name}
                onChange={handleChange}
                onPaste={handlePaste}
                className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                placeholder="Seu nome"
                required
              />
              {errors.full_name && (
                <p className="text-red-400 text-xs mt-1">{errors.full_name}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  CPF
                </label>
                <input
                  name="cpf"
                  type="text"
                  value={formData.cpf}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  placeholder="000.000.000-00"
                  maxLength={14}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Telefone
                </label>
                <input
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  onPaste={handlePaste}
                  className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  required
                />
                {errors.phone && (
                  <p className="text-red-400 text-xs mt-1">{errors.phone}</p>
                )}
              </div>
            </div>

            {!isActivationFlow && !isActivationIntent && (
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  onPaste={handlePaste}
                  className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  placeholder="seu@email.com"
                  required
                />
                {errors.email && (
                  <p className="text-red-400 text-xs mt-1">{errors.email}</p>
                )}
              </div>
            )}

            {!isActivationFlow && !isActivationIntent && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleChange}
                      onPaste={handlePaste}
                      className="w-full px-4 py-3 pr-12 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-5 h-5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                          />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-5 h-5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-400 text-xs mt-1">{errors.password}</p>
                  )}
                  {passwordStrength && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${passwordStrength.barClass} transition-all duration-300`}
                          style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                        />
                      </div>
                      <p className={`text-xs mt-1 ${passwordStrength.textClass}`}>
                        {passwordStrength.label}
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Confirmar Senha
                  </label>
                  <div className="relative">
                    <input
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      onPaste={handlePaste}
                      className="w-full px-4 py-3 pr-12 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                      tabIndex={-1}
                    >
                    {showConfirmPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>
            )}

            {!isActivationFlow && !isActivationIntent && (
              <p className="text-xs text-zinc-500 -mt-1">
                Mín. 8 caracteres com maiúscula, minúscula e número
              </p>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Data de nascimento
              </label>
              <input
                name="birthdate"
                type="date"
                value={formData.birthdate}
                onChange={handleChange}
                onPaste={handlePaste}
                className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || !companyId || hasErrors}
                className="w-full py-3.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold rounded-lg shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    {isActivationFlow || isActivationIntent
                      ? "Validando acesso..."
                      : "Criando conta..."}
                  </span>
                ) : (
                  companyId
                    ? isActivationFlow || isActivationIntent
                      ? "Validar Acesso"
                      : "Criar Conta"
                    : "Carregando empresa..."
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center text-zinc-400 text-sm">
            {isActivationFlow || isActivationIntent
              ? "Quer trocar de conta? "
              : "Já tem uma conta? "}
            <Link
              href={`/${tenant_slug}/auth/login`}
              className="text-white font-semibold hover:text-red-400 transition-colors"
            >
              {isActivationFlow || isActivationIntent
                ? "Entrar com outra conta"
                : "Fazer login"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
