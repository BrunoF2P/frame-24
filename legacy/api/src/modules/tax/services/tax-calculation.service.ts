import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { MunicipalTaxParametersRepository } from '../repositories/municipal-tax-parameters.repository';
import { FederalTaxRatesRepository } from '../repositories/federal-tax-rates.repository';
import { CinemaComplexesRepository } from 'src/modules/operations/cinema-complexes/repositories/cinema-complexes.repository';

export interface TaxCalculationInput {
  gross_amount: number;
  deductions_amount?: number;
  cinema_complex_id: string;
  competence_date: Date;
  revenue_type?: string;
  pis_cofins_regime?: string;
}

type TaxCalculationContext = {
  companyId?: string;
};

export interface TaxCalculationResult {
  gross_amount: number;
  deductions_amount: number;
  calculation_base: number;
  iss_rate: number;
  iss_amount: number;
  pis_rate: number;
  pis_debit_amount: number;
  pis_credit_amount: number;
  pis_amount_payable: number;
  cofins_rate: number;
  cofins_debit_amount: number;
  cofins_credit_amount: number;
  cofins_amount_payable: number;
  total_taxes: number;
  net_amount: number;
  ibge_municipality_code: string;
  iss_service_code?: string;
  pis_cofins_regime: string;
}

@Injectable()
export class TaxCalculationService {
  constructor(
    private readonly municipalTaxParametersRepository: MunicipalTaxParametersRepository,
    private readonly federalTaxRatesRepository: FederalTaxRatesRepository,
    private readonly cinemaComplexesRepository: CinemaComplexesRepository,
    private readonly tenantContext: TenantContextService,
  ) {}

  async calculateTaxes(
    input: TaxCalculationInput,
    context?: TaxCalculationContext,
  ): Promise<TaxCalculationResult> {
    const companyId = context?.companyId ?? this.tenantContext.getCompanyId();

    // Buscar complexo para obter IBGE code
    const complex = await this.cinemaComplexesRepository.findById(
      input.cinema_complex_id,
    );
    if (!complex || complex.company_id !== companyId) {
      throw new NotFoundException('Complexo de cinema não encontrado');
    }

    // Buscar impostos municipais
    const municipalTax =
      await this.municipalTaxParametersRepository.findActiveByCompanyAndIbge(
        companyId,
        complex.ibge_municipality_code,
        input.competence_date,
      );

    // Buscar impostos federais
    const federalTax = await this.federalTaxRatesRepository.findActiveByCompany(
      companyId,
      input.competence_date,
      input.revenue_type,
      input.pis_cofins_regime,
    );

    if (!federalTax) {
      throw new NotFoundException(
        'Parâmetros fiscais federais não encontrados',
      );
    }

    // Calcular base de cálculo
    const deductions = input.deductions_amount || 0;
    const calculation_base = input.gross_amount - deductions;

    // Calcular ISS
    const issRate = municipalTax ? Number(municipalTax.iss_rate) : 0;
    const issAmount = (calculation_base * issRate) / 100;
    const issServiceCode = municipalTax?.iss_service_code || undefined;

    // Calcular PIS
    const pisRate = Number(federalTax.pis_rate);
    const pisDebitAmount = (calculation_base * pisRate) / 100;
    const pisCreditAmount = federalTax.credit_allowed
      ? (deductions * pisRate) / 100
      : 0;
    const pisAmountPayable = pisDebitAmount - pisCreditAmount;

    // Calcular COFINS
    const cofinsRate = Number(federalTax.cofins_rate);
    const cofinsDebitAmount = (calculation_base * cofinsRate) / 100;
    const cofinsCreditAmount = federalTax.credit_allowed
      ? (deductions * cofinsRate) / 100
      : 0;
    const cofinsAmountPayable = cofinsDebitAmount - cofinsCreditAmount;

    // Calcular totais
    const totalTaxes = issAmount + pisAmountPayable + cofinsAmountPayable;
    const netAmount = calculation_base - totalTaxes;

    // Determinar regime PIS/COFINS
    const pisCofinsRegime =
      input.pis_cofins_regime ||
      federalTax.pis_cofins_regime ||
      'Não Cumulativo';

    return {
      gross_amount: input.gross_amount,
      deductions_amount: deductions,
      calculation_base,
      iss_rate: issRate,
      iss_amount: issAmount,
      pis_rate: pisRate,
      pis_debit_amount: pisDebitAmount,
      pis_credit_amount: pisCreditAmount,
      pis_amount_payable: pisAmountPayable,
      cofins_rate: cofinsRate,
      cofins_debit_amount: cofinsDebitAmount,
      cofins_credit_amount: cofinsCreditAmount,
      cofins_amount_payable: cofinsAmountPayable,
      total_taxes: totalTaxes,
      net_amount: netAmount,
      ibge_municipality_code: complex.ibge_municipality_code,
      iss_service_code: issServiceCode,
      pis_cofins_regime: pisCofinsRegime,
    };
  }
}
