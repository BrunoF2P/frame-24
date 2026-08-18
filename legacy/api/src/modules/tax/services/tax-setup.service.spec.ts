import { tax_regime_type } from '@repo/db';
import { BrasilApiService } from 'src/common/services/brasil-api.service';
import { LoggerService } from 'src/common/services/logger.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { FederalTaxRatesRepository } from '../repositories/federal-tax-rates.repository';
import { MunicipalTaxParametersRepository } from '../repositories/municipal-tax-parameters.repository';
import { TaxSetupService } from './tax-setup.service';

describe('TaxSetupService', () => {
  let service: TaxSetupService;
  let federalRepo: jest.Mocked<FederalTaxRatesRepository>;
  let municipalRepo: jest.Mocked<MunicipalTaxParametersRepository>;
  let snowflake: jest.Mocked<SnowflakeService>;
  let logger: jest.Mocked<LoggerService>;
  let brasilApi: jest.Mocked<BrasilApiService>;

  beforeEach(() => {
    federalRepo = {
      create: jest.fn(),
    } as unknown as jest.Mocked<FederalTaxRatesRepository>;

    municipalRepo = {
      create: jest.fn(),
    } as unknown as jest.Mocked<MunicipalTaxParametersRepository>;

    snowflake = {
      generate: jest.fn(),
    } as unknown as jest.Mocked<SnowflakeService>;

    logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;

    brasilApi = {
      getCepData: jest.fn(),
      getMunicipalityByCityAndState: jest.fn(),
    } as unknown as jest.Mocked<BrasilApiService>;

    snowflake.generate.mockReturnValue('id-1');

    service = new TaxSetupService(
      federalRepo,
      municipalRepo,
      snowflake,
      logger,
      brasilApi,
    );
  });

  it('should configure federal and municipal taxes from CEP data', async () => {
    federalRepo.create.mockResolvedValue({ id: 'fed-1' } as never);
    municipalRepo.create.mockResolvedValue({ id: 'mun-1' } as never);
    brasilApi.getCepData.mockResolvedValue({
      city: 'São Paulo',
      state: 'SP',
      ibge: '3550308',
    } as never);

    await service.setupCompanyTaxes({
      companyId: 'company-1',
      taxRegime: tax_regime_type.SIMPLES_NACIONAL,
      zipCode: '01001-000',
    });

    expect(federalRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: 'company-1',
        tax_regime: tax_regime_type.SIMPLES_NACIONAL,
        pis_rate: 0.65,
        cofins_rate: 3,
      }),
    );
    expect(municipalRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: 'company-1',
        ibge_municipality_code: '3550308',
      }),
    );
  });

  it('should fallback to municipality lookup by city/state when CEP has no IBGE', async () => {
    federalRepo.create.mockResolvedValue({ id: 'fed-1' } as never);
    brasilApi.getCepData.mockResolvedValue({
      city: 'Campinas',
      state: 'SP',
      ibge: null,
    } as never);
    brasilApi.getMunicipalityByCityAndState.mockResolvedValue({
      nome: 'Campinas',
      codigo_ibge: '3509502',
      estado: { sigla: 'SP', nome: 'São Paulo' },
    } as never);

    await service.setupCompanyTaxes({
      companyId: 'company-2',
      taxRegime: tax_regime_type.LUCRO_REAL,
      zipCode: '13000-000',
      city: 'Campinas',
      state: 'SP',
    });

    expect(municipalRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: 'company-2',
        ibge_municipality_code: '3509502',
        municipality_name: 'Campinas',
      }),
    );
  });

  it('should swallow setup errors and keep flow non-breaking', async () => {
    federalRepo.create.mockRejectedValue(new Error('db error'));

    await expect(
      service.setupCompanyTaxes({
        companyId: 'company-3',
        taxRegime: tax_regime_type.LUCRO_PRESUMIDO,
      }),
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalled();
  });
});
