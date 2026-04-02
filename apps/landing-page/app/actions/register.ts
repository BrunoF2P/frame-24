"use server";

import axios from "axios";
import type { AxiosError } from "axios";

type FormState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

type ZodIssueLike = {
  path?: unknown;
  message?: unknown;
};

const getString = (value: FormDataEntryValue | null): string => {
  return value?.toString() || "";
};

type ApiErrorPayload = {
  message?: string | string[];
  errors?: unknown;
};

const NETWORK_ERROR_CODES = new Set([
  "ECONNABORTED",
  "ECONNREFUSED",
  "ENETUNREACH",
  "ENOTFOUND",
  "ETIMEDOUT",
]);

const getOptionalString = (value: FormDataEntryValue | null): string | undefined => {
  const normalized = getString(value).trim();
  return normalized.length > 0 ? normalized : undefined;
};

const cleanPhone = (value: FormDataEntryValue | null): string => {
  return value?.toString().replace(/\D/g, "") || "";
};

const toFieldErrors = (errors: unknown): Record<string, string[]> | undefined => {
  if (!Array.isArray(errors)) {
    return undefined;
  }

  const mapped: Record<string, string[]> = {};

  for (const issue of errors as ZodIssueLike[]) {
    const firstPath = Array.isArray(issue.path) ? issue.path[0] : undefined;
    const field = typeof firstPath === "string" ? firstPath : undefined;
    const message = typeof issue.message === "string" ? issue.message : undefined;

    if (!field || !message) {
      continue;
    }

    if (!mapped[field]) {
      mapped[field] = [];
    }

    mapped[field].push(message);
  }

  return Object.keys(mapped).length > 0 ? mapped : undefined;
};

const extractApiMessage = (apiData: ApiErrorPayload | undefined): string => {
  if (typeof apiData?.message === "string" && apiData.message.trim().length > 0) {
    return apiData.message;
  }

  if (Array.isArray(apiData?.message) && apiData.message.length > 0) {
    const first = apiData.message[0];
    if (typeof first === "string") {
      return first;
    }
  }

  return "Erro ao cadastrar empresa.";
};

const extractNetworkMessage = (error: AxiosError<ApiErrorPayload>): string | null => {
  if (error.response) {
    return null;
  }

  if (error.code && NETWORK_ERROR_CODES.has(error.code)) {
    return `A API de cadastro não está disponível no momento. Verifique se o backend está rodando em ${apiBaseUrl}.`;
  }

  if (
    typeof error.message === "string" &&
    error.message.toLowerCase().includes("network")
  ) {
    return `A API de cadastro não está disponível no momento. Verifique se o backend está rodando em ${apiBaseUrl}.`;
  }

  return null;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function registerCompany(
  prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  void prevState;

  try {
    await axios.post(`${apiBaseUrl}/v1/auth/register`, {
      corporate_name: getString(formData.get("corporate_name")).trim(),
      trade_name: getOptionalString(formData.get("trade_name")),
      cnpj: cleanPhone(formData.get("cnpj")),

      company_zip_code: cleanPhone(formData.get("company_zip_code")) || undefined,
      company_street_address: getOptionalString(
        formData.get("company_street_address"),
      ),
      company_address_number: getOptionalString(
        formData.get("company_address_number"),
      ),
      company_address_complement:
        getOptionalString(formData.get("company_address_complement")),
      company_neighborhood: getOptionalString(formData.get("company_neighborhood")),
      company_city: getOptionalString(formData.get("company_city")),
      company_state: getOptionalString(formData.get("company_state"))?.toUpperCase(),
      company_phone: cleanPhone(formData.get("company_phone")) || undefined,
      company_email:
        getOptionalString(formData.get("company_email"))?.toLowerCase(),

      full_name: getString(formData.get("full_name")).trim(),
      email: getString(formData.get("email")).trim().toLowerCase(),
      password: getString(formData.get("password")).trim(),
      mobile: cleanPhone(formData.get("mobile")) || undefined,
      plan_type: "BASIC",
    });

    return {
      success: true,
      message:
        "Cadastro realizado! Verifique seu email para confirmar sua conta.",
    };
  } catch (error: unknown) {
    const axiosError = error as AxiosError<ApiErrorPayload>;
    const apiData = axiosError.response?.data;
    const fieldErrors = toFieldErrors(apiData?.errors);
    const networkMessage = extractNetworkMessage(axiosError);

    return {
      success: false,
      message: networkMessage ?? extractApiMessage(apiData),
      errors: fieldErrors,
    };
  }
}
