import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import axios from 'axios';

interface CnpjData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  opcao_pelo_simples: boolean | null;
}

interface CepData {
  cep: string;
  state: string;
  city: string;
  neighborhood?: string;
  street?: string;
  ibge?: string;
}

interface MunicipalityData {
  id?: string;
  nome: string;
  codigo_ibge: string;
  estado?: {
    sigla: string;
    nome: string;
  };
  // Estrutura alternativa que pode vir da API
  regiao?: {
    id?: number;
    sigla?: string;
    nome?: string;
  };
}

interface MunicipalityApiItem {
  id?: string;
  nome?: string;
  name?: string;
  codigo_ibge?: string;
  codigoIbge?: string;
  estado?: {
    sigla?: string;
    nome?: string;
  };
  [key: string]: unknown;
}

@Injectable()
export class BrasilApiService {
  private readonly logger = new Logger(BrasilApiService.name);
  private readonly client = axios.create({
    baseURL: 'https://brasilapi.com.br/api',
  });

  private safeStringify(value: unknown): string {
    try {
      return JSON.stringify(value);
    } catch {
      return '[unserializable payload]';
    }
  }

  async getCnpjData(cnpj: string): Promise<CnpjData | null> {
    try {
      const sanitizedCnpj = cnpj.replace(/\D/g, '');
      this.logger.log(`Querying BrasilAPI for CNPJ: ${sanitizedCnpj}`);

      const response = await this.client.get<CnpjData>(
        `/cnpj/v1/${sanitizedCnpj}`,
      );
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          this.logger.warn(`CNPJ not found on BrasilAPI: ${cnpj}`);
          return null;
        }

        this.logger.error(
          `BrasilAPI request failed (status: ${error.response?.status ?? 'unknown'})`,
          error.stack || error.message,
        );
      } else if (error instanceof Error) {
        this.logger.error(
          'BrasilAPI request failed unexpectedly.',
          error.stack,
        );
      } else {
        this.logger.error(
          'BrasilAPI request failed with unknown error type.',
          String(error),
        );
      }

      throw new InternalServerErrorException(
        'Falha ao consultar dados externos do CNPJ.',
      );
    }
  }

  async getCepData(cep: string): Promise<CepData | null> {
    try {
      const sanitizedCep = cep.replace(/\D/g, '');
      this.logger.log(`Querying BrasilAPI for CEP: ${sanitizedCep}`);

      const response = await this.client.get<CepData>(
        `/cep/v1/${sanitizedCep}`,
      );
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          this.logger.warn(`CEP not found on BrasilAPI: ${cep}`);
          return null;
        }

        this.logger.error(
          `BrasilAPI CEP request failed (status: ${error.response?.status ?? 'unknown'})`,
          error.stack || error.message,
        );
      } else if (error instanceof Error) {
        this.logger.error(
          'BrasilAPI CEP request failed unexpectedly.',
          error.stack,
        );
      } else {
        this.logger.error(
          'BrasilAPI CEP request failed with unknown error type.',
          String(error),
        );
      }

      // Não lança exceção para CEP, apenas retorna null
      return null;
    }
  }

  async getMunicipalityByCityAndState(
    city: string,
    state: string,
  ): Promise<MunicipalityData | null> {
    try {
      this.logger.log(`Querying BrasilAPI for municipality: ${city}, ${state}`);

      // A API de municípios da BrasilAPI usa o formato: /ibge/municipios/v1/{sigla_estado}
      const response = await this.client.get<MunicipalityApiItem[]>(
        `/ibge/municipios/v1/${state}`,
      );

      if (!response.data || response.data.length === 0) {
        this.logger.warn(`No municipalities found for state: ${state}`);
        return null;
      }

      // Log para debug - ver estrutura da resposta
      if (response.data.length > 0) {
        this.logger.log(
          `Sample municipality structure: ${this.safeStringify(response.data[0])}`,
        );
      }

      // Buscar o município pelo nome (case-insensitive)
      const normalizedCity = city
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

      const municipality = response.data.find((m) => {
        const normalizedName = (m.nome || m.name || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim();
        return normalizedName === normalizedCity;
      });

      if (!municipality) {
        this.logger.warn(`Municipality not found: ${city}, ${state}`);
        return null;
      }

      // Normalizar a resposta para o formato esperado
      const normalized: MunicipalityData = {
        nome: municipality.nome || municipality.name || city,
        codigo_ibge:
          municipality.codigo_ibge ||
          municipality.codigoIbge ||
          municipality.id ||
          '',
        estado: municipality.estado
          ? {
              sigla: municipality.estado.sigla || state,
              nome: municipality.estado.nome || '',
            }
          : undefined,
      };

      if (!normalized.codigo_ibge) {
        this.logger.warn(
          `Municipality found but no IBGE code: ${this.safeStringify(municipality)}`,
        );
        return null;
      }

      return normalized;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          this.logger.warn(
            `Municipality not found on BrasilAPI: ${city}, ${state}`,
          );
          return null;
        }

        this.logger.error(
          `BrasilAPI municipality request failed (status: ${error.response?.status ?? 'unknown'})`,
          error.stack || error.message,
        );
      } else if (error instanceof Error) {
        this.logger.error(
          'BrasilAPI municipality request failed unexpectedly.',
          error.stack,
        );
      } else {
        this.logger.error(
          'BrasilAPI municipality request failed with unknown error type.',
          String(error),
        );
      }

      return null;
    }
  }
}
