import { NotFoundException } from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { CreateFederalTaxRateDto } from '../dto/create-federal-tax-rate.dto';
import { FederalTaxRatesRepository } from '../repositories/federal-tax-rates.repository';
import { FederalTaxRatesService } from './federal-tax-rates.service';

describe('FederalTaxRatesService', () => {
  const repository = {
    create: jest.fn(),
    findAllByCompany: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<FederalTaxRatesRepository>;

  const snowflake = {
    generate: jest.fn(),
  } as unknown as jest.Mocked<SnowflakeService>;

  const cls = {
    getCompanyId: jest.fn(),
    getUserId: jest.fn(),
    getRequiredUserId: jest.fn(),
    getCustomerId: jest.fn(),
    getSessionContext: jest.fn(),
  } as unknown as jest.Mocked<TenantContextService>;

  const service = new FederalTaxRatesService(repository, snowflake, cls);

  beforeEach(() => {
    jest.clearAllMocks();
    snowflake.generate.mockReturnValue('tax-id-1');
    cls.getCompanyId.mockReturnValue('company-123');
  });

  it('deve criar taxa usando company_id do contexto', async () => {
    const dto = {
      tax_regime: 'Lucro Real',
      pis_rate: 1.65,
      cofins_rate: 7.6,
      irpj_base_rate: 15,
      csll_rate: 9,
      validity_start: new Date('2026-01-01'),
    } as CreateFederalTaxRateDto;

    repository.create.mockResolvedValue({ id: 'tax-id-1' } as any);

    await service.create(dto);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'tax-id-1',
        company_id: 'company-123',
      }),
    );
  });

  it('deve lançar not found quando registro não pertence à empresa', async () => {
    repository.findById.mockResolvedValue({
      id: 'tax-id-1',
      company_id: 'other-company',
    } as any);

    await expect(service.findById('tax-id-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('deve remover registro após validar posse', async () => {
    repository.findById.mockResolvedValue({
      id: 'tax-id-1',
      company_id: 'company-123',
    } as any);

    await service.delete('tax-id-1');

    expect(repository.delete).toHaveBeenCalledWith('tax-id-1');
  });
});
