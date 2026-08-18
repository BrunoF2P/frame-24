import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { CreateContractTypeDto } from '../dto/create-contract-type.dto';
import { ContractTypesRepository } from '../repositories/contract-types.repository';
import { ContractTypesService } from './contract-types.service';

describe('ContractTypesService', () => {
  const repository = {
    create: jest.fn(),
    findAllByCompany: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<ContractTypesRepository>;

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

  const service = new ContractTypesService(repository, snowflake, cls);

  beforeEach(() => {
    jest.clearAllMocks();
    snowflake.generate.mockReturnValue('ct-1');
    cls.getCompanyId.mockReturnValue('company-123');
  });

  it('deve criar tipo com company_id do contexto', async () => {
    const dto = { name: 'Percentual Fixo' } as CreateContractTypeDto;
    repository.create.mockResolvedValue({ id: 'ct-1' } as any);

    await service.create(dto);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'ct-1',
        company_id: 'company-123',
      }),
    );
  });

  it('deve listar tipos da empresa do contexto', async () => {
    repository.findAllByCompany.mockResolvedValue([{ id: 'ct-1' }] as any);

    const result = await service.findAll();

    expect(repository.findAllByCompany).toHaveBeenCalledWith('company-123');
    expect(result).toEqual([{ id: 'ct-1' }]);
  });

  it('deve lançar not found para tipo de outra empresa', async () => {
    repository.findById.mockResolvedValue({
      id: 'ct-1',
      company_id: 'company-999',
    } as any);

    await expect(service.findOne('ct-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('deve lançar erro quando contexto da empresa não existir', async () => {
    cls.getCompanyId.mockImplementation(() => {
      throw new ForbiddenException('Contexto da empresa não encontrado.');
    });

    await expect(service.findAll()).rejects.toBeInstanceOf(ForbiddenException);
  });
});
