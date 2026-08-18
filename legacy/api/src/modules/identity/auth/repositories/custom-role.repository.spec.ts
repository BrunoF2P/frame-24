import { Test, TestingModule } from '@nestjs/testing';
import { CustomRoleRepository } from './custom-role.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { Prisma } from '@repo/db';

type MockPrismaService = {
  custom_roles: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
};

describe('CustomRoleRepository', () => {
  let repository: CustomRoleRepository;
  let prismaService: MockPrismaService;
  let snowflakeService: jest.Mocked<SnowflakeService>;

  const mockCustomRole = {
    id: '123456789',
    company_id: 'company-456',
    name: 'Administrador',
    description: 'Role com acesso total',
    is_system_role: true,
    hierarchy_level: 1,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomRoleRepository,
        {
          provide: PrismaService,
          useValue: {
            custom_roles: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
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

    repository = module.get<CustomRoleRepository>(CustomRoleRepository);
    prismaService = module.get(PrismaService);
    snowflakeService = module.get(SnowflakeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(repository).toBeDefined();
  });

  describe('findById', () => {
    it('deve retornar uma role quando encontrada', async () => {
      prismaService.custom_roles.findUnique.mockResolvedValue(mockCustomRole);

      const result = await repository.findById('123456789');

      expect(result).toEqual(mockCustomRole);
      expect(prismaService.custom_roles.findUnique).toHaveBeenCalledWith({
        where: { id: '123456789' },
      });
    });

    it('deve retornar null quando role não existir', async () => {
      prismaService.custom_roles.findUnique.mockResolvedValue(null);

      const result = await repository.findById('id-inexistente');

      expect(result).toBeNull();
      expect(prismaService.custom_roles.findUnique).toHaveBeenCalledWith({
        where: { id: 'id-inexistente' },
      });
    });

    it('deve usar findUnique do Prisma', async () => {
      prismaService.custom_roles.findUnique.mockResolvedValue(mockCustomRole);

      await repository.findById('123456789');

      expect(prismaService.custom_roles.findUnique).toHaveBeenCalled();
    });
  });

  describe('findByIdAndCompany', () => {
    it('deve retornar uma role quando encontrada por ID e empresa', async () => {
      prismaService.custom_roles.findFirst.mockResolvedValue(mockCustomRole);

      const result = await repository.findByIdAndCompany(
        '123456789',
        'company-456',
      );

      expect(result).toEqual(mockCustomRole);
      expect(prismaService.custom_roles.findFirst).toHaveBeenCalledWith({
        where: {
          id: '123456789',
          company_id: 'company-456',
        },
      });
    });

    it('deve retornar null quando role não pertencer à empresa', async () => {
      prismaService.custom_roles.findFirst.mockResolvedValue(null);

      const result = await repository.findByIdAndCompany(
        '123456789',
        'company-999',
      );

      expect(result).toBeNull();
    });

    it('deve filtrar por ID e company_id simultaneamente', async () => {
      prismaService.custom_roles.findFirst.mockResolvedValue(mockCustomRole);

      await repository.findByIdAndCompany('123456789', 'company-456');

      expect(prismaService.custom_roles.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: '123456789',
            company_id: 'company-456',
          }),
        }),
      );
    });
  });

  describe('findByName', () => {
    it('deve retornar uma role quando encontrada por nome', async () => {
      prismaService.custom_roles.findFirst.mockResolvedValue(mockCustomRole);

      const result = await repository.findByName(
        'company-456',
        'Administrador',
      );

      expect(result).toEqual(mockCustomRole);
      expect(prismaService.custom_roles.findFirst).toHaveBeenCalledWith({
        where: {
          company_id: 'company-456',
          name: 'Administrador',
        },
      });
    });

    it('deve retornar null quando role com nome não existir', async () => {
      prismaService.custom_roles.findFirst.mockResolvedValue(null);

      const result = await repository.findByName(
        'company-456',
        'RoleInexistente',
      );

      expect(result).toBeNull();
    });

    it('deve buscar por nome exato', async () => {
      prismaService.custom_roles.findFirst.mockResolvedValue(mockCustomRole);

      await repository.findByName('company-456', 'Administrador');

      expect(prismaService.custom_roles.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: 'Administrador',
          }),
        }),
      );
    });

    it('deve filtrar por company_id ao buscar por nome', async () => {
      prismaService.custom_roles.findFirst.mockResolvedValue(mockCustomRole);

      await repository.findByName('company-456', 'Administrador');

      expect(prismaService.custom_roles.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            company_id: 'company-456',
          }),
        }),
      );
    });
  });

  describe('findDefaultRole', () => {
    const mockDefaultRole = {
      ...mockCustomRole,
      name: 'Super Admin',
      description: 'Administrador com acesso total',
      is_system_role: true,
      hierarchy_level: 1,
    };

    it('deve retornar a primeira role de sistema quando existir', async () => {
      prismaService.custom_roles.findFirst.mockResolvedValue(mockDefaultRole);

      const result = await repository.findDefaultRole('company-456');

      expect(result).toEqual(mockDefaultRole);
      expect(result?.is_system_role).toBe(true);
      expect(prismaService.custom_roles.findFirst).toHaveBeenCalledWith({
        where: {
          company_id: 'company-456',
          is_system_role: true,
        },
      });
    });

    it('deve retornar null quando não houver role de sistema', async () => {
      prismaService.custom_roles.findFirst.mockResolvedValue(null);

      const result = await repository.findDefaultRole('company-456');

      expect(result).toBeNull();
    });

    it('deve buscar especificamente por is_system_role true', async () => {
      prismaService.custom_roles.findFirst.mockResolvedValue(mockDefaultRole);

      await repository.findDefaultRole('company-456');

      expect(prismaService.custom_roles.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            is_system_role: true,
          }),
        }),
      );
    });

    it('deve filtrar por company_id ao buscar role padrão', async () => {
      prismaService.custom_roles.findFirst.mockResolvedValue(mockDefaultRole);

      await repository.findDefaultRole('company-456');

      expect(prismaService.custom_roles.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            company_id: 'company-456',
          }),
        }),
      );
    });

    it('deve retornar a primeira role de sistema encontrada', async () => {
      prismaService.custom_roles.findFirst.mockResolvedValue(mockDefaultRole);

      const result = await repository.findDefaultRole('company-456');

      expect(result).toBeDefined();
      expect(result?.is_system_role).toBe(true);
      expect(result?.name).toBe('Super Admin');
    });
  });

  describe('create', () => {
    const createData: Prisma.custom_rolesCreateInput = {
      companies: { connect: { id: 'company-456' } },
      name: 'Gerente',
      description: 'Role de gerência',
      is_system_role: false,
      hierarchy_level: 3,
    };

    it('deve criar uma nova role com sucesso', async () => {
      const newRole = {
        ...mockCustomRole,
        name: 'Gerente',
        description: 'Role de gerência',
        hierarchy_level: 3,
      };
      prismaService.custom_roles.create.mockResolvedValue(newRole);

      const result = await repository.create(createData);

      expect(result).toEqual(newRole);
      expect(prismaService.custom_roles.create).toHaveBeenCalledWith({
        data: {
          id: '123456789',
          ...createData,
        },
      });
    });

    it('deve gerar um ID usando SnowflakeService', async () => {
      prismaService.custom_roles.create.mockResolvedValue(mockCustomRole);

      await repository.create(createData);

      expect(snowflakeService.generate).toHaveBeenCalled();
      expect(prismaService.custom_roles.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: '123456789',
          }),
        }),
      );
    });

    it('deve incluir todos os dados fornecidos na criação', async () => {
      prismaService.custom_roles.create.mockResolvedValue(mockCustomRole);

      await repository.create(createData);

      expect(prismaService.custom_roles.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...createData,
          id: expect.any(String),
        }),
      });
    });
  });

  describe('createAdminRole', () => {
    it('deve criar a role Super Admin com company_id explícito', async () => {
      prismaService.custom_roles.create.mockResolvedValue({
        ...mockCustomRole,
        name: 'Super Admin',
      });

      const result = await repository.createAdminRole('company-456');

      expect(result).toEqual(
        expect.objectContaining({
          name: 'Super Admin',
        }),
      );
      expect(prismaService.custom_roles.create).toHaveBeenCalledWith({
        data: {
          id: '123456789',
          company_id: 'company-456',
          name: 'Super Admin',
          description: 'Administrador com acesso total',
          is_system_role: true,
          hierarchy_level: 1,
        },
      });
    });
  });

  describe('update', () => {
    const updateData: Prisma.custom_rolesUpdateInput = {
      description: 'Descrição atualizada',
      hierarchy_level: 2,
    };

    it('deve atualizar uma role com sucesso', async () => {
      const updatedRole = {
        ...mockCustomRole,
        description: 'Descrição atualizada',
        hierarchy_level: 2,
      };
      prismaService.custom_roles.update.mockResolvedValue(updatedRole);

      const result = await repository.update('123456789', updateData);

      expect(result).toEqual(updatedRole);
      expect(prismaService.custom_roles.update).toHaveBeenCalledWith({
        where: { id: '123456789' },
        data: updateData,
      });
    });

    it('deve usar o ID correto na atualização', async () => {
      prismaService.custom_roles.update.mockResolvedValue(mockCustomRole);

      await repository.update('123456789', updateData);

      expect(prismaService.custom_roles.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '123456789' },
        }),
      );
    });

    it('deve passar os dados de atualização corretamente', async () => {
      prismaService.custom_roles.update.mockResolvedValue(mockCustomRole);

      await repository.update('123456789', updateData);

      expect(prismaService.custom_roles.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: updateData,
        }),
      );
    });
  });

  describe('delete', () => {
    it('deve deletar uma role com sucesso', async () => {
      prismaService.custom_roles.delete.mockResolvedValue(mockCustomRole);

      const result = await repository.delete('123456789');

      expect(result).toEqual(mockCustomRole);
      expect(prismaService.custom_roles.delete).toHaveBeenCalledWith({
        where: { id: '123456789' },
      });
    });

    it('deve usar o ID correto na exclusão', async () => {
      prismaService.custom_roles.delete.mockResolvedValue(mockCustomRole);

      await repository.delete('123456789');

      expect(prismaService.custom_roles.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '123456789' },
        }),
      );
    });

    it('deve retornar a role deletada', async () => {
      prismaService.custom_roles.delete.mockResolvedValue(mockCustomRole);

      const result = await repository.delete('123456789');

      expect(result).toBeDefined();
      expect(result.id).toBe('123456789');
    });
  });
});
