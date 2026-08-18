import { NotFoundException } from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { LoggerService } from 'src/common/services/logger.service';
import { CompanyUserRepository } from 'src/modules/identity/auth/repositories/company-user.repository';
import { CustomRoleRepository } from 'src/modules/identity/auth/repositories/custom-role.repository';
import { IdentityRepository } from 'src/modules/identity/auth/repositories/identity.repository';
import { PersonRepository } from 'src/modules/identity/auth/repositories/person.repository';
import { UserCreatorService } from './user-creator.service';
import { UserMapperService } from './user-mapper.service';
import { UsersService } from './users.service';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

describe('UsersService', () => {
  const identityRepository = {} as IdentityRepository;
  const personRepository = {} as PersonRepository;
  const customRoleRepository = {} as CustomRoleRepository;
  const userCreator = {} as UserCreatorService;

  const companyUserRepository = {
    findAllByCompanyWithRelations: jest.fn(),
    findByEmployeeIdAndCompanyWithRelations: jest.fn(),
    softDelete: jest.fn(),
  } as unknown as jest.Mocked<CompanyUserRepository>;

  const userMapper = {
    toResponseDto: jest.fn(),
  } as unknown as jest.Mocked<UserMapperService>;

  const logger = {
    log: jest.fn(),
  } as unknown as jest.Mocked<LoggerService>;

  const cls = {
    getCompanyId: jest.fn(),
    getUserId: jest.fn(),
    getRequiredUserId: jest.fn(),
    getCustomerId: jest.fn(),
    getSessionContext: jest.fn(),
  } as unknown as jest.Mocked<TenantContextService>;

  const service = new UsersService(
    identityRepository,
    personRepository,
    companyUserRepository,
    customRoleRepository,
    userCreator,
    userMapper,
    logger,
    cls,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    cls.getCompanyId.mockReturnValue('company-123');
  });

  it('deve listar usuários usando company_id do contexto', async () => {
    companyUserRepository.findAllByCompanyWithRelations.mockResolvedValue([
      { id: 'cu-1' } as any,
    ]);
    userMapper.toResponseDto.mockReturnValue({ employee_id: 'CE-0001' } as any);

    const result = await service.findAll();

    expect(
      companyUserRepository.findAllByCompanyWithRelations,
    ).toHaveBeenCalledWith('company-123');
    expect(result).toEqual([{ employee_id: 'CE-0001' }]);
  });

  it('deve lançar not found ao buscar usuário inexistente', async () => {
    companyUserRepository.findByEmployeeIdAndCompanyWithRelations.mockResolvedValue(
      null,
    );

    await expect(service.findOne('CE-0001')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('deve executar soft delete validando contexto da empresa', async () => {
    companyUserRepository.findByEmployeeIdAndCompanyWithRelations.mockResolvedValue(
      { id: 'cu-1' } as any,
    );

    await service.softDelete('CE-0001');

    expect(
      companyUserRepository.findByEmployeeIdAndCompanyWithRelations,
    ).toHaveBeenCalledWith('CE-0001', 'company-123');
    expect(companyUserRepository.softDelete).toHaveBeenCalledWith('cu-1');
  });
});
