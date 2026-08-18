import { Injectable } from '@nestjs/common';
import { tax_regime_type } from '@repo/db';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { LoggerService } from 'src/common/services/logger.service';
import { BrasilApiService } from 'src/common/services/brasil-api.service';
import { FederalTaxRatesRepository } from '../repositories/federal-tax-rates.repository';
import { MunicipalTaxParametersRepository } from '../repositories/municipal-tax-parameters.repository';

type SetupCompanyTaxesInput = {
  companyId: string;
  taxRegime: tax_regime_type;
  zipCode?: string;
  city?: string;
  state?: string;
};

@Injectable()
export class TaxSetupService {
  constructor(
    private readonly federalTaxRatesRepository: FederalTaxRatesRepository,
    private readonly municipalTaxParametersRepository: MunicipalTaxParametersRepository,
    private readonly snowflake: SnowflakeService,
    private readonly logger: LoggerService,
    private readonly brasilApiService: BrasilApiService,
  ) {}

  /**
   * Configura os impostos iniciais para uma empresa recém-criada
   */
  async setupCompanyTaxes(input: SetupCompanyTaxesInput): Promise<void> {
    const { companyId, taxRegime, zipCode, city, state } = input;
    this.logger.log(
      `Configurando impostos para empresa ${companyId} (regime: ${taxRegime})`,
      TaxSetupService.name,
    );

    try {
      // Configurar impostos federais baseado no regime tributário
      await this.setupFederalTaxes(companyId, taxRegime);

      // Configurar impostos municipais (ISS) baseado no município
      if (zipCode || (city && state)) {
        await this.setupMunicipalTaxes(companyId, zipCode, city, state);
      } else {
        this.logger.warn(
          `Não foi possível configurar impostos municipais para empresa ${companyId}: CEP ou cidade/estado não informados`,
          TaxSetupService.name,
        );
      }

      this.logger.log(
        `Impostos configurados com sucesso para empresa ${companyId}`,
        TaxSetupService.name,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao configurar impostos para empresa ${companyId}: ${error instanceof Error ? error.message : String(error)}`,
        TaxSetupService.name,
      );
      // Não lança exceção para não quebrar o fluxo de criação da empresa
      // Os impostos podem ser configurados manualmente depois
    }
  }

  /**
   * Configura impostos federais (PIS, COFINS) baseado no regime tributário
   */
  private async setupFederalTaxes(
    companyId: string,
    taxRegime: tax_regime_type,
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let pisRate: number;
    let cofinsRate: number;
    let pisCofinsRegime: string;
    let creditAllowed: boolean;
    let irpjBaseRate: number | null = null;
    let irpjAdditionalRate: number | null = null;
    let irpjAdditionalLimit: number | null = null;
    let csllRate: number | null = null;
    let presumedProfitPercentage: number | null = null;

    switch (taxRegime) {
      case tax_regime_type.SIMPLES_NACIONAL:
        // Simples Nacional: PIS 0,65% e COFINS 3% (cumulativo)
        pisRate = 0.65;
        cofinsRate = 3.0;
        pisCofinsRegime = 'Cumulativo';
        creditAllowed = false;
        // No Simples Nacional, os impostos são pagos através do DAS
        // Não há IRPJ e CSLL separados
        break;

      case tax_regime_type.LUCRO_PRESUMIDO:
        // Lucro Presumido: PIS 1,65% e COFINS 7,6% (não cumulativo)
        pisRate = 1.65;
        cofinsRate = 7.6;
        pisCofinsRegime = 'Não Cumulativo';
        creditAllowed = true;
        // IRPJ: 15% base + 10% adicional sobre lucro acima de R$ 20.000/mês
        irpjBaseRate = 15.0;
        irpjAdditionalRate = 10.0;
        irpjAdditionalLimit = 20000.0;
        // CSLL: 9% sobre o lucro presumido
        csllRate = 9.0;
        // Percentual de presunção de lucro para serviços: 32%
        presumedProfitPercentage = 32.0;
        break;

      case tax_regime_type.LUCRO_REAL:
        // Lucro Real: PIS 1,65% e COFINS 7,6% (não cumulativo)
        pisRate = 1.65;
        cofinsRate = 7.6;
        pisCofinsRegime = 'Não Cumulativo';
        creditAllowed = true;
        // IRPJ: 15% base + 10% adicional sobre lucro acima de R$ 20.000/mês
        irpjBaseRate = 15.0;
        irpjAdditionalRate = 10.0;
        irpjAdditionalLimit = 20000.0;
        // CSLL: 9% sobre o lucro real
        csllRate = 9.0;
        // No Lucro Real não há presunção
        break;

      default:
        // Fallback para Lucro Presumido
        pisRate = 1.65;
        cofinsRate = 7.6;
        pisCofinsRegime = 'Não Cumulativo';
        creditAllowed = true;
        irpjBaseRate = 15.0;
        irpjAdditionalRate = 10.0;
        irpjAdditionalLimit = 20000.0;
        csllRate = 9.0;
        presumedProfitPercentage = 32.0;
    }

    await this.federalTaxRatesRepository.create({
      id: this.snowflake.generate(),
      company_id: companyId,
      tax_regime: taxRegime,
      pis_cofins_regime: pisCofinsRegime,
      pis_rate: pisRate,
      cofins_rate: cofinsRate,
      credit_allowed: creditAllowed,
      irpj_base_rate: irpjBaseRate,
      irpj_additional_rate: irpjAdditionalRate,
      irpj_additional_limit: irpjAdditionalLimit,
      csll_rate: csllRate,
      presumed_profit_percentage: presumedProfitPercentage,
      validity_start: today,
      active: true,
    });

    this.logger.log(
      `Impostos federais configurados: PIS ${pisRate}%, COFINS ${cofinsRate}% (${pisCofinsRegime})`,
      TaxSetupService.name,
    );
  }

  /**
   * Configura impostos municipais (ISS) baseado no município
   */
  private async setupMunicipalTaxes(
    companyId: string,
    zipCode?: string,
    city?: string,
    state?: string,
  ): Promise<void> {
    let ibgeCode: string | null = null;
    let municipalityName: string | null = null;
    let stateCode: string | null = state || null;

    // Tentar buscar código IBGE pelo CEP
    if (zipCode) {
      const cepData = await this.brasilApiService.getCepData(zipCode);
      if (cepData) {
        ibgeCode = cepData.ibge || null;
        municipalityName = cepData.city || null;
        stateCode = cepData.state || stateCode;

        if (ibgeCode) {
          this.logger.log(
            `Código IBGE obtido via CEP: ${ibgeCode} para ${municipalityName}`,
            TaxSetupService.name,
          );
        }
      }
    }

    // Se não conseguiu pelo CEP, tentar buscar pela API de municípios usando cidade e estado
    if (!ibgeCode && city && stateCode) {
      this.logger.log(
        `Tentando buscar código IBGE pela API de municípios: ${city}, ${stateCode}`,
        TaxSetupService.name,
      );

      const municipalityData =
        await this.brasilApiService.getMunicipalityByCityAndState(
          city,
          stateCode,
        );

      if (municipalityData && municipalityData.codigo_ibge) {
        ibgeCode = municipalityData.codigo_ibge;
        municipalityName = municipalityData.nome;
        // Manter o stateCode original se a API não retornar
        if (municipalityData.estado?.sigla) {
          stateCode = municipalityData.estado.sigla;
        }

        this.logger.log(
          `Código IBGE obtido via API de municípios: ${ibgeCode} para ${municipalityName}`,
          TaxSetupService.name,
        );
      } else {
        // Fallback: usar cidade informada mesmo sem código IBGE
        municipalityName = city;
        this.logger.warn(
          `Não foi possível obter código IBGE para ${city}, ${stateCode}. Tentando criar com dados informados.`,
          TaxSetupService.name,
        );
      }
    }

    // Se ainda não temos código IBGE, não podemos criar o parâmetro municipal
    // (o código IBGE é obrigatório no schema)
    if (!ibgeCode || !municipalityName || !stateCode) {
      this.logger.warn(
        `Não foi possível obter código IBGE para empresa ${companyId} (CEP: ${zipCode || 'não informado'}, Cidade: ${city || 'não informada'}, Estado: ${stateCode || 'não informado'}). Impostos municipais não serão configurados automaticamente.`,
        TaxSetupService.name,
      );
      return;
    }

    // ISS padrão para serviços de exibição cinematográfica: 5%
    // Este valor pode variar por município, mas 5% é um valor comum
    const defaultIssRate = 5.0;
    const issServiceCode = '14.01.01'; // Código de serviço para exibição cinematográfica

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.municipalTaxParametersRepository.create({
      id: this.snowflake.generate(),
      company_id: companyId,
      ibge_municipality_code: ibgeCode,
      municipality_name: municipalityName,
      state: stateCode,
      iss_rate: defaultIssRate,
      iss_service_code: issServiceCode,
      iss_concession_applicable: false,
      iss_withholding: false,
      validity_start: today,
      active: true,
      notes:
        'Configuração automática no cadastro da empresa. Valores podem ser ajustados manualmente.',
    });

    this.logger.log(
      `Impostos municipais configurados: ISS ${defaultIssRate}% para ${municipalityName} (${ibgeCode})`,
      TaxSetupService.name,
    );
  }
}
