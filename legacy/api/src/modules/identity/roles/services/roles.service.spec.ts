import { ForbiddenException } from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { LoggerService } from 'src/common/services/logger.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { CustomRoleRepository } from '../repositories/custom-role.repository';
import { RolesService } from './roles.service';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

describe('RolesService', () => {
  const prisma = {
    permissions: { findMany: jest.fn() },
    role_permissions: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
      findFirst: jest.fn(),
    },
    company_users: { count: jest.fn(), findUnique: jest.fn() },
    custom_roles: { findUnique: jest.fn() },
  } as any;

  const roleRepo = {
    findByName: jest.fn(),
    create: jest.fn(),
    findAllByCompany: jest.fn(),
    getRolePermissions: jest.fn(),
    findByIdAndCompany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<CustomRoleRepository>;

  const logger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as jest.Mocked<LoggerService>;

  const snowflake = {
    generate: jest.fn(),
  } as unknown as jest.Mocked<SnowflakeService>;

  const cls = {
    getCompanyId: jest.fn(),
    getUserId: jest.fn(),
    getRequiredUserId: jest.fn(),
    getCustomerId: jest.fn(),
    getSessionContext: jest.fn(),
    getIdentityId: jest.fn(),
    getRoleHierarchy: jest.fn(),
  } as unknown as jest.Mocked<TenantContextService>;

  const service = new RolesService(prisma, roleRepo, logger, snowflake, cls);

  beforeEach(() => {
    jest.clearAllMocks();
    snowflake.generate.mockReturnValue('rp-1');
    cls.getCompanyId.mockReturnValue('company-123');
  });

  it('deve criar role usando company_id do contexto', async () => {
    const dto = {
      name: 'Operador',
      permissions: ['users:read'],
    } as CreateRoleDto;

    roleRepo.findByName.mockResolvedValue(null);
    prisma.permissions.findMany.mockResolvedValue([
      { id: 'perm-1', code: 'users:read' },
    ]);
    roleRepo.create.mockResolvedValue({
      id: 'role-1',
      name: 'Operador',
      description: null,
      is_system_role: false,
      hierarchy_level: 50,
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-01T00:00:00.000Z'),
    } as any);
    prisma.role_permissions.createMany.mockResolvedValue({ count: 1 });

    await service.create(dto);

    expect(roleRepo.findByName).toHaveBeenCalledWith('company-123', 'Operador');
    expect(roleRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        companies: { connect: { id: 'company-123' } },
      }),
    );
    expect(prisma.role_permissions.createMany).toHaveBeenCalled();
  });

  it('deve listar roles usando company_id do contexto', async () => {
    roleRepo.findAllByCompany.mockResolvedValue([
      {
        id: 'role-1',
        name: 'Operador',
        description: null,
        is_system_role: false,
        hierarchy_level: 50,
        created_at: new Date('2026-01-01T00:00:00.000Z'),
        updated_at: new Date('2026-01-01T00:00:00.000Z'),
      } as any,
    ]);
    roleRepo.getRolePermissions.mockResolvedValue(['users:read']);

    const result = await service.findAll();

    expect(roleRepo.findAllByCompany).toHaveBeenCalledWith('company-123');
    expect(result).toHaveLength(1);
    expect(result[0].permissions).toEqual(['users:read']);
  });

  it('deve lançar erro quando company_id não existe no contexto', async () => {
    cls.getCompanyId.mockImplementation(() => {
      throw new ForbiddenException('Contexto da empresa não encontrado.');
    });

    await expect(service.findAll()).rejects.toBeInstanceOf(ForbiddenException);
  });
});
