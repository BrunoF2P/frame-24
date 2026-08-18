import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { LoggerService } from 'src/common/services/logger.service';
import { CreateSupplierDto } from '../dto/create-supplier.dto';
import { SupplierRepository } from '../repositories/supplier.repository';
import { SuppliersService } from './suppliers.service';

describe('SuppliersService', () => {
  const repository = {
    create: jest.fn(),
    findByCnpj: jest.fn(),
    findByCompany: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    findDistributors: jest.fn(),
    findTypes: jest.fn(),
  } as unknown as jest.Mocked<SupplierRepository>;

  const logger = {
    log: jest.fn(),
  } as unknown as jest.Mocked<LoggerService>;

  const cls = {
    getCompanyId: jest.fn(),
    getUserId: jest.fn(),
    getRequiredUserId: jest.fn(),
    getCustomerId: jest.fn(),
    getSessionContext: jest.fn(),
    getIdentityId: jest.fn(),
    getRoleHierarchy: jest.fn(),
  } as unknown as jest.Mocked<TenantContextService>;

  const service = new SuppliersService(repository, logger, cls);

  beforeEach(() => {
    jest.clearAllMocks();
    cls.getCompanyId.mockReturnValue('company-123');
  });

  it('deve criar fornecedor usando company_id do contexto', async () => {
    const dto = {
      corporate_name: 'Paris Filmes LTDA',
      cnpj: '12.345.678/0001-90',
      phone: '(11)3334-5566',
    } as CreateSupplierDto;

    repository.findByCnpj.mockResolvedValue(null);
    repository.create.mockResolvedValue({ id: 'sup-1' } as any);

    await service.create(dto);

    expect(repository.findByCnpj).toHaveBeenCalledWith(
      '12345678000190',
      'company-123',
    );
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: 'company-123',
        cnpj: '12345678000190',
        phone: '1133345566',
      }),
    );
  });

  it('deve listar fornecedores da empresa do contexto', async () => {
    repository.findByCompany.mockResolvedValue([{ id: 'sup-1' }] as any);

    const result = await service.findAll(true);

    expect(repository.findByCompany).toHaveBeenCalledWith('company-123', true);
    expect(result).toEqual([{ id: 'sup-1' }]);
  });

  it('deve lançar not found para fornecedor de outra empresa', async () => {
    repository.findById.mockResolvedValue({
      id: 'sup-1',
      company_id: 'company-999',
    } as any);

    await expect(service.findOne('sup-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('deve lançar erro quando company_id não existe no contexto', async () => {
    cls.getCompanyId.mockImplementation(() => {
      throw new ForbiddenException('Contexto da empresa não encontrado.');
    });

    await expect(service.findAll()).rejects.toBeInstanceOf(ForbiddenException);
  });
});
