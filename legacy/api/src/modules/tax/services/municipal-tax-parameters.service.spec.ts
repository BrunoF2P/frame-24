import { NotFoundException } from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { CreateMunicipalTaxParameterDto } from '../dto/create-municipal-tax-parameter.dto';
import { MunicipalTaxParametersRepository } from '../repositories/municipal-tax-parameters.repository';
import { MunicipalTaxParametersService } from './municipal-tax-parameters.service';

describe('MunicipalTaxParametersService', () => {
  const repository = {
    create: jest.fn(),
    findAllByCompany: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<MunicipalTaxParametersRepository>;

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

  const service = new MunicipalTaxParametersService(repository, snowflake, cls);

  beforeEach(() => {
    jest.clearAllMocks();
    snowflake.generate.mockReturnValue('municipal-id-1');
    cls.getCompanyId.mockReturnValue('company-123');
  });

  it('deve criar parâmetro usando company_id do contexto', async () => {
    const dto = {
      ibge_municipality_code: '3550308',
      municipality_name: 'São Paulo',
      state: 'SP',
      iss_rate: 5,
      validity_start: new Date('2026-01-01'),
    } as CreateMunicipalTaxParameterDto;

    repository.create.mockResolvedValue({ id: 'municipal-id-1' } as any);

    await service.create(dto);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'municipal-id-1',
        company_id: 'company-123',
      }),
    );
  });

  it('deve lançar not found quando parâmetro não pertence à empresa', async () => {
    repository.findById.mockResolvedValue({
      id: 'municipal-id-1',
      company_id: 'other-company',
    } as any);

    await expect(service.findById('municipal-id-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('deve remover parâmetro após validar posse', async () => {
    repository.findById.mockResolvedValue({
      id: 'municipal-id-1',
      company_id: 'company-123',
    } as any);

    await service.delete('municipal-id-1');

    expect(repository.delete).toHaveBeenCalledWith('municipal-id-1');
  });
});
