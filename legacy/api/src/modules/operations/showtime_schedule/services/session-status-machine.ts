import { UnprocessableEntityException } from '@nestjs/common';

/**
 * Máquina de estados para transições de status de sessão de cinema.
 *
 * Garante que sessões só possam transicionar entre estados válidos,
 * evitando inconsistências como cancelar uma sessão já encerrada
 * ou reabrir uma sessão finalizada.
 *
 * Transições válidas:
 *   RASCUNHO    → PUBLICADA, CANCELADA
 *   PUBLICADA   → ABERTA, CANCELADA
 *   ABERTA      → ENCERRADA, CANCELADA
 *   ENCERRADA   → (estado terminal)
 *   CANCELADA   → (estado terminal)
 */

// Status canônicos normalizados (sem acento, lowercase)
const VALID_TRANSITIONS: Record<string, string[]> = {
  rascunho: ['publicada', 'cancelada'],
  publicada: ['aberta', 'cancelada'],
  aberta: ['encerrada', 'cancelada'],
  encerrada: [], // terminal
  cancelada: [], // terminal
};

/**
 * Normaliza um nome de status para comparação canônica.
 * Remove acentos, converte para lowercase e trim.
 */
export function normalizeStatusName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Valida se a transição de status é permitida.
 *
 * @throws UnprocessableEntityException se a transição é inválida
 */
export function assertValidStatusTransition(
  currentStatusName: string,
  targetStatusName: string,
): void {
  const normalizedCurrent = normalizeStatusName(currentStatusName);
  const normalizedTarget = normalizeStatusName(targetStatusName);

  // Se o status atual não é reconhecido, permitir qualquer transição
  // (para compatibilidade com status customizados legados)
  const allowedTargets = VALID_TRANSITIONS[normalizedCurrent];
  if (!allowedTargets) {
    return;
  }

  // Se o target não é um status canônico, permitir (status customizado)
  if (!Object.keys(VALID_TRANSITIONS).includes(normalizedTarget)) {
    return;
  }

  // Mesmos status — noop, permitir
  if (normalizedCurrent === normalizedTarget) {
    return;
  }

  if (!allowedTargets.includes(normalizedTarget)) {
    throw new UnprocessableEntityException(
      `Transição de status inválida: "${currentStatusName}" → "${targetStatusName}". ` +
        `Transições permitidas a partir de "${currentStatusName}": ${
          allowedTargets.length > 0
            ? allowedTargets.map((s) => `"${s}"`).join(', ')
            : '(estado terminal — nenhuma transição permitida)'
        }`,
    );
  }
}

/**
 * Verifica se o status atual é um estado terminal.
 */
export function isTerminalStatus(statusName: string): boolean {
  const normalized = normalizeStatusName(statusName);
  const allowed = VALID_TRANSITIONS[normalized];
  return allowed !== undefined && allowed.length === 0;
}
