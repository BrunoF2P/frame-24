/**
 * Configuração do Snowflake ID Generator
 *
 * Estrutura do Snowflake (64 bits) conforme @sapphire/snowflake:
 * - 41 bits: timestamp (milissegundos desde epoch customizada)
 * - 5 bits: worker ID (0-31)
 * - 5 bits: process ID (0-31)
 * - 12 bits: increment/sequence (0-4095 por milissegundo)
 */

function getWorkerId(): bigint {
  const raw = process.env.WORKER_ID || process.env.HOSTNAME?.slice(-3) || '1';
  const parsed = parseInt(raw, 10);

  if (Number.isNaN(parsed) || parsed < 0) {
    return 1n;
  }

  return BigInt(parsed) & 0b11111n;
}

export const SNOWFLAKE_CONFIG = {
  // Epoch customizada: 1 de janeiro de 2024 00:00:00 UTC
  // Isso dá ~69 anos de IDs únicos a partir dessa data
  epoch: new Date('2024-01-01T00:00:00Z').getTime(),

  // Worker ID baseado no ambiente (0-31)
  workerId: getWorkerId(),
};
