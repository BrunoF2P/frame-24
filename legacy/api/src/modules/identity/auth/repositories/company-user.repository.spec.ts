import { Test, TestingModule } from '@nestjs/testing';
import { CompanyUserRepository } from './company-user.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { CompanyUser } from '../domain/entities/company-user.entity';
import { CompanyUserMapper } from '../infraestructure/mappers/company-user.mapper';

type MockPrismaService = {
  company_users: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
};

describe('CompanyUserRepository', () => {
  let repository: CompanyUserRepository;
  let prismaService: MockPrismaService;
  let snowflakeService: jest.Mocked<SnowflakeService>;

  const mockRawCompanyUser: {
    id: string;
    identity_id: string;
    company_id: string;
    role_id: string;
    employee_id: string;
    department: string;
    job_level: string;
    location: string;
    allowed_complexes: string;
    ip_whitelist: string;
    active: boolean;
    start_date: Date;
    end_date: null;
    last_access: null;
    access_count: number;
    created_at: Date;
    updated_at: Date;
  } = {
    id: '123456789',
    identity_id: 'identity-123',
    company_id: 'company-456',
    role_id: 'role-789',
    employee_id: 'EMP001',
    department: 'TI',
    job_level: 'Senior',
    location: 'São Paulo',
    allowed_complexes: JSON.stringify(['complex-1', 'complex-2']),
    ip_whitelist: JSON.stringify(['192.168.1.1']),
    active: true,
    start_date: new Date('2025-01-01'),
    end_date: null,
    last_access: null,
    access_count: 0,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockCompanyUserWithRelations = {
    ...mockRawCompanyUser,
    identities: {
      id: 'identity-123',
      email: 'test@example.com',
      identity_type: 'EMPLOYEE' as const,
      persons: {
        id: 'person-123',
        full_name: 'João Silva',
      },
    },
    custom_roles: {
      id: 'role-789',
      name: 'Admin',
      description: 'Administrator',
    },
  };

  const mockDomainCompanyUser: CompanyUser = {
    id: '123456789',
    identityId: 'identity-123',
    companyId: 'company-456',
    roleId: 'role-789',
    employeeId: 'EMP001',
    department: 'TI',
    jobLevel: 'Senior',
    location: 'São Paulo',
    allowedComplexes: ['complex-1', 'complex-2'],
    ipWhitelist: ['192.168.1.1'],
    active: true,
    startDate: new Date('2025-01-01'),
    endDate: null,
    lastAccess: null,
    accessCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as CompanyUser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyUserRepository,
        {
          provide: PrismaService,
          useValue: {
            company_users: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
        {
          provide: SnowflakeService,
          useValue: {
            generate: jest.fn().mockReturnValue('123456789'),
          },
        },
      ],
    }).compile();

    repository = module.get<CompanyUserRepository>(CompanyUserRepository);
    prismaService = module.get(PrismaService);
    snowflakeService = module.get(SnowflakeService);

    // Mock do mapper
    jest
      .spyOn(CompanyUserMapper, 'toDomain')
      .mockReturnValue(mockDomainCompanyUser);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(repository).toBeDefined();
  });

  describe('findById', () => {
    it('deve retornar um CompanyUser do domínio quando encontrado', async () => {
      prismaService.company_users.findUnique.mockResolvedValue(
        mockRawCompanyUser,
      );

      const result = await repository.findById('123456789');

      expect(result).toEqual(mockDomainCompanyUser);
      expect(prismaService.company_users.findUnique).toHaveBeenCalledWith({
        where: { id: '123456789' },
      });
      expect(CompanyUserMapper.toDomain).toHaveBeenCalledWith(
        mockRawCompanyUser,
      );
    });

    it('deve retornar null quando não encontrado', async () => {
      prismaService.company_users.findUnique.mockResolvedValue(null);

      const result = await repository.findById('id-inexistente');

      expect(result).toBeNull();
      expect(CompanyUserMapper.toDomain).not.toHaveBeenCalled();
    });
  });

  describe('findByIdentityAndCompany', () => {
    it('deve retornar usuário quando encontrado por identity e company', async () => {
      prismaService.company_users.findFirst.mockResolvedValue(
        mockRawCompanyUser,
      );

      const result = await repository.findByIdentityAndCompany(
        'identity-123',
        'company-456',
      );

      expect(result).toEqual(mockDomainCompanyUser);
      expect(prismaService.company_users.findFirst).toHaveBeenCalledWith({
        where: {
          identity_id: 'identity-123',
          company_id: 'company-456',
          active: true,
        },
      });
    });

    it('deve buscar sem filtro de empresa quando company_id não fornecido', async () => {
      prismaService.company_users.findFirst.mockResolvedValue(
        mockRawCompanyUser,
      );

      await repository.findByIdentityAndCompany('identity-123');

      expect(prismaService.company_users.findFirst).toHaveBeenCalledWith({
        where: {
          identity_id: 'identity-123',
          active: true,
        },
      });
    });

    it('deve retornar null quando não encontrado', async () => {
      prismaService.company_users.findFirst.mockResolvedValue(null);

      const result = await repository.findByIdentityAndCompany('identity-123');

      expect(result).toBeNull();
    });
  });

  describe('findAllByIdentity', () => {
    it('deve retornar lista de CompanyUsers para uma identity', async () => {
      const mockList = [
        mockRawCompanyUser,
        { ...mockRawCompanyUser, id: '987' },
      ];
      prismaService.company_users.findMany.mockResolvedValue(mockList);

      const result = await repository.findAllByIdentity('identity-123');

      expect(result).toHaveLength(2);
      expect(prismaService.company_users.findMany).toHaveBeenCalledWith({
        where: {
          identity_id: 'identity-123',
          active: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      });
      expect(CompanyUserMapper.toDomain).toHaveBeenCalledTimes(2);
    });

    it('deve retornar array vazio quando não houver usuários', async () => {
      prismaService.company_users.findMany.mockResolvedValue([]);

      const result = await repository.findAllByIdentity('identity-123');

      expect(result).toEqual([]);
    });
  });

  describe('findByEmployeeIdAndCompany', () => {
    it('deve retornar usuário quando encontrado por employee_id', async () => {
      prismaService.company_users.findFirst.mockResolvedValue(
        mockRawCompanyUser,
      );

      const result = await repository.findByEmployeeIdAndCompany(
        'EMP001',
        'company-456',
      );

      expect(result).toEqual(mockDomainCompanyUser);
      expect(prismaService.company_users.findFirst).toHaveBeenCalledWith({
        where: {
          employee_id: 'EMP001',
          company_id: 'company-456',
          identities: {
            identity_type: 'EMPLOYEE',
          },
        },
      });
    });

    it('deve retornar null quando employee não encontrado', async () => {
      prismaService.company_users.findFirst.mockResolvedValue(null);

      const result = await repository.findByEmployeeIdAndCompany(
        'EMP999',
        'company-456',
      );

      expect(result).toBeNull();
    });
  });

  describe('findAllByCompany', () => {
    it('deve retornar todos os usuários de uma empresa', async () => {
      const mockList = [mockRawCompanyUser];
      prismaService.company_users.findMany.mockResolvedValue(mockList);

      const result = await repository.findAllByCompany('company-456');

      expect(result).toHaveLength(1);
      expect(prismaService.company_users.findMany).toHaveBeenCalledWith({
        where: { company_id: 'company-456' },
        orderBy: { created_at: 'desc' },
      });
    });
  });

  describe('create', () => {
    it('deve criar um novo company user', async () => {
      prismaService.company_users.create.mockResolvedValue(mockRawCompanyUser);

      const result = await repository.create(
        'identity-123',
        'company-456',
        'role-789',
        'EMP001',
      );

      expect(result).toEqual(mockDomainCompanyUser);
      expect(snowflakeService.generate).toHaveBeenCalled();
      expect(prismaService.company_users.create).toHaveBeenCalledWith({
        data: {
          id: '123456789',
          identity_id: 'identity-123',
          company_id: 'company-456',
          role_id: 'role-789',
          employee_id: 'EMP001',
          active: true,
          start_date: expect.any(Date),
        },
      });
    });
  });

  describe('createUser', () => {
    it('deve criar usuário com todos os dados', async () => {
      prismaService.company_users.create.mockResolvedValue(mockRawCompanyUser);

      const result = await repository.createUser({
        identityId: 'identity-123',
        companyId: 'company-456',
        roleId: 'role-789',
        employeeId: 'EMP001',
        department: 'TI',
        jobLevel: 'Senior',
        location: 'São Paulo',
        allowedComplexes: ['complex-1'],
        ipWhitelist: ['192.168.1.1'],
        active: true,
      });

      expect(result).toEqual(mockDomainCompanyUser);
      expect(prismaService.company_users.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          identity_id: 'identity-123',
          company_id: 'company-456',
          role_id: 'role-789',
          department: 'TI',
          job_level: 'Senior',
          location: 'São Paulo',
          allowed_complexes: JSON.stringify(['complex-1']),
          ip_whitelist: JSON.stringify(['192.168.1.1']),
        }),
      });
    });
  });

  describe('updateUserData', () => {
    it('deve atualizar dados do usuário', async () => {
      prismaService.company_users.update.mockResolvedValue(mockRawCompanyUser);

      const result = await repository.updateUserData('123456789', {
        department: 'RH',
        jobLevel: 'Pleno',
      });

      expect(result).toEqual(mockDomainCompanyUser);
      expect(prismaService.company_users.update).toHaveBeenCalledWith({
        where: { id: '123456789' },
        data: {
          department: 'RH',
          job_level: 'Pleno',
        },
      });
    });
  });

  describe('updateAccessTracking', () => {
    it('deve atualizar rastreamento de acesso', async () => {
      prismaService.company_users.update.mockResolvedValue(mockRawCompanyUser);
      const lastAccess = new Date();

      const result = await repository.updateAccessTracking('123456789', {
        lastAccess,
        accessCount: 5,
      });

      expect(result).toEqual(mockDomainCompanyUser);
      expect(prismaService.company_users.update).toHaveBeenCalledWith({
        where: { id: '123456789' },
        data: {
          last_access: lastAccess,
          access_count: 5,
        },
      });
    });
  });

  describe('softDelete', () => {
    it('deve desativar usuário', async () => {
      prismaService.company_users.update.mockResolvedValue({
        ...mockRawCompanyUser,
        active: false,
        end_date: new Date(),
      });

      const result = await repository.softDelete('123456789');

      expect(result).toEqual(mockDomainCompanyUser);
      expect(prismaService.company_users.update).toHaveBeenCalledWith({
        where: { id: '123456789' },
        data: {
          active: false,
          end_date: expect.any(Date),
        },
      });
    });
  });

  describe('delete', () => {
    it('deve deletar permanentemente', async () => {
      prismaService.company_users.delete.mockResolvedValue(mockRawCompanyUser);

      const result = await repository.delete('123456789');

      expect(result).toEqual(mockDomainCompanyUser);
      expect(prismaService.company_users.delete).toHaveBeenCalledWith({
        where: { id: '123456789' },
      });
    });
  });

  describe('findByIdWithRelations', () => {
    it('deve retornar usuário com relações', async () => {
      prismaService.company_users.findUnique.mockResolvedValue(
        mockCompanyUserWithRelations,
      );

      const result = await repository.findByIdWithRelations('123456789');

      expect(result).toEqual(mockCompanyUserWithRelations);
      expect(prismaService.company_users.findUnique).toHaveBeenCalledWith({
        where: { id: '123456789' },
        include: {
          custom_roles: true,
          identities: {
            include: {
              persons: true,
            },
          },
        },
      });
    });
  });

  describe('findByEmployeeIdAndCompanyWithRelations', () => {
    it('deve retornar employee com relações', async () => {
      prismaService.company_users.findFirst.mockResolvedValue(
        mockCompanyUserWithRelations,
      );

      const result = await repository.findByEmployeeIdAndCompanyWithRelations(
        'EMP001',
        'company-456',
      );

      expect(result).toEqual(mockCompanyUserWithRelations);
    });
  });

  describe('findAllByCompanyWithRelations', () => {
    it('deve retornar todos os usuários com relações', async () => {
      prismaService.company_users.findMany.mockResolvedValue([
        mockCompanyUserWithRelations,
      ]);

      const result =
        await repository.findAllByCompanyWithRelations('company-456');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockCompanyUserWithRelations);
    });
  });
});
