import { NotFoundException } from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { CinemaComplexesRepository } from 'src/modules/operations/cinema-complexes/repositories/cinema-complexes.repository';
import { FederalTaxRatesRepository } from '../repositories/federal-tax-rates.repository';
import { MunicipalTaxParametersRepository } from '../repositories/municipal-tax-parameters.repository';
import { TaxCalculationService } from './tax-calculation.service';

describe('TaxCalculationService', () => {
  let service: TaxCalculationService;
  let municipalRepo: jest.Mocked<MunicipalTaxParametersRepository>;
  let federalRepo: jest.Mocked<FederalTaxRatesRepository>;
  let complexesRepo: jest.Mocked<CinemaComplexesRepository>;
  let tenantContext: jest.Mocked<TenantContextService>;

  beforeEach(() => {
    municipalRepo = {
      findActiveByCompanyAndIbge: jest.fn(),
    } as unknown as jest.Mocked<MunicipalTaxParametersRepository>;

    federalRepo = {
      findActiveByCompany: jest.fn(),
    } as unknown as jest.Mocked<FederalTaxRatesRepository>;

    complexesRepo = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<CinemaComplexesRepository>;

    tenantContext = {
      getCompanyId: jest.fn(),
    } as unknown as jest.Mocked<TenantContextService>;

    tenantContext.getCompanyId.mockReturnValue('company-1');

    service = new TaxCalculationService(
      municipalRepo,
      federalRepo,
      complexesRepo,
      tenantContext,
    );
  });

  it('should throw when cinema complex is not found or not owned by company', async () => {
    complexesRepo.findById.mockResolvedValue(null);

    await expect(
      service.calculateTaxes({
        gross_amount: 1000,
        cinema_complex_id: 'complex-1',
        competence_date: new Date('2026-03-01'),
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw when federal parameters are missing', async () => {
    complexesRepo.findById.mockResolvedValue({
      id: 'complex-1',
      company_id: 'company-1',
      ibge_municipality_code: '3550308',
    } as never);
    municipalRepo.findActiveByCompanyAndIbge.mockResolvedValue(null);
    federalRepo.findActiveByCompany.mockResolvedValue(null);

    await expect(
      service.calculateTaxes({
        gross_amount: 1000,
        cinema_complex_id: 'complex-1',
        competence_date: new Date('2026-03-01'),
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should calculate taxes including ISS and PIS/COFINS credits', async () => {
    complexesRepo.findById.mockResolvedValue({
      id: 'complex-1',
      company_id: 'company-1',
      ibge_municipality_code: '3550308',
    } as never);
    municipalRepo.findActiveByCompanyAndIbge.mockResolvedValue({
      iss_rate: 5,
      iss_service_code: '14.01',
    } as never);
    federalRepo.findActiveByCompany.mockResolvedValue({
      pis_rate: 1.65,
      cofins_rate: 7.6,
      credit_allowed: true,
      pis_cofins_regime: 'Não Cumulativo',
    } as never);

    const result = await service.calculateTaxes({
      gross_amount: 1000,
      deductions_amount: 200,
      cinema_complex_id: 'complex-1',
      competence_date: new Date('2026-03-01'),
    });

    expect(result.calculation_base).toBe(800);
    expect(result.iss_amount).toBe(40);
    expect(result.pis_debit_amount).toBeCloseTo(13.2, 2);
    expect(result.pis_credit_amount).toBeCloseTo(3.3, 2);
    expect(result.cofins_debit_amount).toBeCloseTo(60.8, 2);
    expect(result.cofins_credit_amount).toBeCloseTo(15.2, 2);
    expect(result.total_taxes).toBeCloseTo(95.5, 1);
    expect(result.net_amount).toBeCloseTo(704.5, 1);
  });
});
