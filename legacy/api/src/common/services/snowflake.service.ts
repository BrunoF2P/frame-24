import { Injectable } from '@nestjs/common';
import { Snowflake } from '@sapphire/snowflake';
import { SNOWFLAKE_CONFIG } from '../config/snowflake.config';

/**
 * Serviço para geração de IDs únicos usando Snowflake
 *
 * Baseado em @sapphire/snowflake, retorna strings para compatibilidade
 * com Prisma (String IDs) e APIs REST (JSON não suporta bigint nativamente).
 */
@Injectable()
export class SnowflakeService {
  private readonly snowflake: Snowflake;

  constructor() {
    this.snowflake = new Snowflake(SNOWFLAKE_CONFIG.epoch);
    // Configura o workerId da instância
    this.snowflake.workerId = SNOWFLAKE_CONFIG.workerId;
  }

  /**
   * Gera um Snowflake ID único como string
   * @returns String ID (ex: "7234567890123456789")
   */
  generate(): string {
    return this.snowflake.generate().toString();
  }

  /**
   * Gera múltiplos IDs de uma vez
   * @param count Quantidade de IDs
   * @returns Array de IDs
   */
  generateBulk(count: number): string[] {
    return Array.from({ length: count }, () => this.generate());
  }

  /**
   * Deconstruct de um Snowflake ID
   * @param id Snowflake ID (string ou bigint)
   * @returns Objeto desestruturado
   */
  deconstruct(id: string | bigint) {
    const bigIntId = typeof id === 'string' ? BigInt(id) : id;
    return this.snowflake.deconstruct(bigIntId);
  }

  /**
   * Extrai apenas o timestamp de um Snowflake ID
   * @param id Snowflake ID (string ou bigint)
   * @returns Timestamp em milissegundos
   */
  timestampFrom(id: string | bigint): number {
    const bigIntId = typeof id === 'string' ? BigInt(id) : id;
    return this.snowflake.timestampFrom(bigIntId);
  }
}
