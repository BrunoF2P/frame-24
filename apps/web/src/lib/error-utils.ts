export function extractErrorMessage(
  error: unknown,
  defaultMessage: string = "Ocorreu um erro inesperado",
): string {
  const safeStringify = (value: unknown): string => {
    try {
      return JSON.stringify(value);
    } catch {
      return "[unserializable error payload]";
    }
  };

  if (!error) return defaultMessage;

  // Se for string direta
  if (typeof error === "string") return error;

  // Se tiver response.data (Axios)
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object" &&
    (error as { response?: unknown }).response !== null &&
    "data" in
      ((error as { response?: unknown }).response as {
        data?: unknown;
      })
  ) {
    const data = ((error as { response?: unknown }).response as { data?: unknown })
      .data as { message?: unknown };

    // Caso 1: message é string direta no data
    if (typeof data.message === "string") {
      return data.message;
    }

    // Caso 2: message é array de strings
    if (Array.isArray(data.message)) {
      return data.message.join(", ");
    }

    // Caso 3: message é objeto
    if (typeof data.message === "object" && data.message !== null) {
      const nestedMessage = data.message;

      // Subcaso 3a: Validação do Zod/NestJS (array de errors)
      // Ex: { message: { errors: [{ message: "Senha muito curta" }] } }
      if (
        "errors" in nestedMessage &&
        Array.isArray((nestedMessage as { errors?: unknown }).errors)
      ) {
        const errors = (nestedMessage as { errors: Array<{ message?: string }> })
          .errors;
        return errors
          .map((e) => e.message || safeStringify(e))
          .join(", ");
      }

      // Subcaso 3b: Mensagem aninhada simples
      // Ex: { message: { message: "Erro específico" } }
      if (
        "message" in nestedMessage &&
        typeof (nestedMessage as { message?: unknown }).message === "string"
      ) {
        return (nestedMessage as { message: string }).message;
      }
    }
  }

  // Fallback para mensagem de erro do objeto Error
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return defaultMessage;
}
