import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { Company } from 'src/modules/identity/auth/domain/entities/company.entity';
import { CompanyMapper } from 'src/modules/identity/auth/infraestructure/mappers/company.mapper';
import { companies, Prisma, $Enums } from '@repo/db';
import { CompanyRepository } from 'src/modules/identity/companies/repositories/company.repository';

type MockPrismaService = {
  companies: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
};

describe('CompanyRepository', () => {
  let repository: CompanyRepository;
  let prismaService: MockPrismaService;

  const mockRawCompany: companies = {
    id: '123456789',
    corporate_name: 'CineFrame Entretenimento LTDA',
    trade_name: 'CineFrame Cinemas',
    cnpj: '12345678000199',
    tax_regime: 'LUCRO_PRESUMIDO' as $Enums.tax_regime_type,

    zip_code: '01310100',
    street_address: 'Av. Paulista',
    address_number: '1578',
    address_complement: 'Conj 101',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    country: 'BR',
    phone: '1133334444',
    mobile: '11999999999',
    email: 'contato@cineframe.com.br',
    website: 'https://www.cineframe.com.br',
    state_registration: '123456789000',
    municipal_registration: '987654321000',
    recine_opt_in: true,
    recine_join_date: new Date('2025-01-01'),
    logo_url: 'https://cdn.example.com/logo.png',
    max_complexes: 10,
    max_employees: 100,
    max_storage_gb: 50,
    plan_type: 'PREMIUM',
    plan_expires_at: new Date('2026-11-01'),
    tenant_slug: 'cineframe',
    suspended: false,
    suspension_reason: null,
    active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockDomainCompany: Company = {
    id: '123456789',
    corporateName: 'CineFrame Entretenimento LTDA',
    tradeName: 'CineFrame Cinemas',
    cnpj: '12345678000199',
    taxRegime: 'LUCRO_PRESUMIDO',
    zipCode: '01310100',
    streetAddress: 'Av. Paulista',
    addressNumber: '1578',
    addressComplement: 'Conj 101',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    country: 'BR',
    phone: '1133334444',
    mobile: '11999999999',
    email: 'contato@cineframe.com.br',
    website: 'https://www.cineframe.com.br',
    stateRegistration: '123456789000',
    municipalRegistration: '987654321000',
    recineOptIn: true,
    recineJoinDate: new Date('2025-01-01'),
    logoUrl: 'https://cdn.example.com/logo.png',
    maxComplexes: 10,
    maxEmployees: 100,
    maxStorageGb: 50,
    planType: 'PREMIUM',
    planExpiresAt: new Date('2026-11-01'),
    tenantSlug: 'cineframe',
    suspended: false,
    suspensionReason: null,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Company;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyRepository,
        {
          provide: PrismaService,
          useValue: {
            companies: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<CompanyRepository>(CompanyRepository);
    prismaService = module.get(PrismaService);

    jest.spyOn(CompanyMapper, 'toDomain').mockReturnValue(mockDomainCompany);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(repository).toBeDefined();
  });

  describe('findById', () => {
    it('deve retornar Company do domínio quando encontrada', async () => {
      prismaService.companies.findUnique.mockResolvedValue(mockRawCompany);

      const result = await repository.findById('123456789');

      expect(result).toEqual(mockDomainCompany);
      expect(prismaService.companies.findUnique).toHaveBeenCalledWith({
        where: { id: '123456789' },
      });
      expect(CompanyMapper.toDomain).toHaveBeenCalledWith(mockRawCompany);
    });

    it('deve retornar null quando empresa não encontrada', async () => {
      prismaService.companies.findUnique.mockResolvedValue(null);

      const result = await repository.findById('id-inexistente');

      expect(result).toBeNull();
      expect(CompanyMapper.toDomain).not.toHaveBeenCalled();
    });

    it('deve usar findUnique do Prisma', async () => {
      prismaService.companies.findUnique.mockResolvedValue(mockRawCompany);

      await repository.findById('123456789');

      expect(prismaService.companies.findUnique).toHaveBeenCalled();
    });
  });

  describe('findByCnpj', () => {
    it('deve retornar empresa quando encontrada por CNPJ', async () => {
      prismaService.companies.findUnique.mockResolvedValue(mockRawCompany);

      const result = await repository.findByCnpj('12345678000199');

      expect(result).toEqual(mockRawCompany);
      expect(prismaService.companies.findUnique).toHaveBeenCalledWith({
        where: { cnpj: '12345678000199' },
      });
    });

    it('deve retornar null quando CNPJ não encontrado', async () => {
      prismaService.companies.findUnique.mockResolvedValue(null);

      const result = await repository.findByCnpj('00000000000000');

      expect(result).toBeNull();
    });

    it('deve buscar por CNPJ sem máscara', async () => {
      prismaService.companies.findUnique.mockResolvedValue(mockRawCompany);

      await repository.findByCnpj('12345678000199');

      expect(prismaService.companies.findUnique).toHaveBeenCalledWith({
        where: { cnpj: '12345678000199' },
      });
    });

    it('deve usar constraint único de CNPJ', async () => {
      prismaService.companies.findUnique.mockResolvedValue(mockRawCompany);

      await repository.findByCnpj('12345678000199');

      expect(prismaService.companies.findUnique).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    const mockCompanies = [
      mockRawCompany,
      { ...mockRawCompany, id: '987654321', cnpj: '98765432000111' },
    ];

    it('deve retornar lista de empresas ativas com paginação padrão', async () => {
      prismaService.companies.findMany.mockResolvedValue(mockCompanies);

      const result = await repository.findAll();

      expect(result).toEqual(mockCompanies);
      expect(result).toHaveLength(2);
      expect(prismaService.companies.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: { active: true },
        orderBy: { created_at: 'desc' },
      });
    });

    it('deve retornar empresas com skip e take personalizados', async () => {
      prismaService.companies.findMany.mockResolvedValue(mockCompanies);

      const result = await repository.findAll(20, 5);

      expect(result).toEqual(mockCompanies);
      expect(prismaService.companies.findMany).toHaveBeenCalledWith({
        skip: 20,
        take: 5,
        where: { active: true },
        orderBy: { created_at: 'desc' },
      });
    });

    it('deve retornar array vazio quando não houver empresas', async () => {
      prismaService.companies.findMany.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('deve filtrar apenas empresas ativas', async () => {
      prismaService.companies.findMany.mockResolvedValue(mockCompanies);

      await repository.findAll();

      expect(prismaService.companies.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { active: true },
        }),
      );
    });

    it('deve ordenar por data de criação decrescente', async () => {
      prismaService.companies.findMany.mockResolvedValue(mockCompanies);

      await repository.findAll();

      expect(prismaService.companies.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { created_at: 'desc' },
        }),
      );
    });
  });

  describe('create', () => {
    const createData: Prisma.companiesCreateInput = {
      tenant_slug: '',
      corporate_name: 'Nova Empresa LTDA',
      cnpj: '11122233344455',
      tax_regime: 'SIMPLES_NACIONAL',
      active: true,
    };

    it('deve criar uma nova empresa com sucesso', async () => {
      prismaService.companies.create.mockResolvedValue(mockRawCompany);

      const result = await repository.create(createData);

      expect(result).toEqual(mockRawCompany);
      expect(prismaService.companies.create).toHaveBeenCalledWith({
        data: createData,
      });
    });

    it('deve delegar a geração de ID ao Prisma/schema', async () => {
      prismaService.companies.create.mockResolvedValue(mockRawCompany);

      await repository.create(createData);

      expect(prismaService.companies.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ...createData,
          }),
        }),
      );
    });

    it('deve incluir todos os dados fornecidos na criação', async () => {
      const fullData: Prisma.companiesCreateInput = {
        tenant_slug: '',
        corporate_name: 'Empresa Completa LTDA',
        cnpj: '11122233344455',
        trade_name: 'Empresa Completa',
        tax_regime: 'LUCRO_PRESUMIDO',
        zip_code: '01310100',
        street_address: 'Rua Teste',
        city: 'São Paulo',
        state: 'SP',
        country: 'BR',
        active: true,
      };
      prismaService.companies.create.mockResolvedValue(mockRawCompany);

      await repository.create(fullData);

      expect(prismaService.companies.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...fullData,
        }),
      });
    });
  });

  describe('update', () => {
    const updateData: Prisma.companiesUpdateInput = {
      trade_name: 'Novo Nome Fantasia',
      email: 'novo@email.com.br',
    };

    it('deve atualizar uma empresa com sucesso', async () => {
      const updatedCompany = {
        ...mockRawCompany,
        trade_name: 'Novo Nome Fantasia',
        email: 'novo@email.com.br',
      };
      prismaService.companies.update.mockResolvedValue(updatedCompany);

      const result = await repository.update('123456789', updateData);

      expect(result).toEqual(updatedCompany);
      expect(prismaService.companies.update).toHaveBeenCalledWith({
        where: { id: '123456789' },
        data: updateData,
      });
    });

    it('deve usar o ID correto na atualização', async () => {
      prismaService.companies.update.mockResolvedValue(mockRawCompany);

      await repository.update('987654321', updateData);

      expect(prismaService.companies.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '987654321' },
        }),
      );
    });

    it('deve permitir atualização parcial de dados', async () => {
      const partialUpdate: Prisma.companiesUpdateInput = {
        mobile: '11988887777',
      };
      prismaService.companies.update.mockResolvedValue(mockRawCompany);

      await repository.update('123456789', partialUpdate);

      expect(prismaService.companies.update).toHaveBeenCalledWith({
        where: { id: '123456789' },
        data: partialUpdate,
      });
    });

    it('deve permitir atualizar endereço completo', async () => {
      const addressUpdate: Prisma.companiesUpdateInput = {
        zip_code: '04567890',
        street_address: 'Rua Nova',
        address_number: '500',
        city: 'Rio de Janeiro',
        state: 'RJ',
      };
      prismaService.companies.update.mockResolvedValue(mockRawCompany);

      await repository.update('123456789', addressUpdate);

      expect(prismaService.companies.update).toHaveBeenCalledWith({
        where: { id: '123456789' },
        data: addressUpdate,
      });
    });

    it('deve permitir atualizar configurações de plano', async () => {
      const planUpdate: Prisma.companiesUpdateInput = {
        plan_type: 'ENTERPRISE',
        max_complexes: 20,
        max_employees: 200,
        max_storage_gb: 100,
      };
      prismaService.companies.update.mockResolvedValue(mockRawCompany);

      await repository.update('123456789', planUpdate);

      expect(prismaService.companies.update).toHaveBeenCalledWith({
        where: { id: '123456789' },
        data: planUpdate,
      });
    });
  });

  describe('delete', () => {
    it('deve deletar uma empresa com sucesso', async () => {
      prismaService.companies.delete.mockResolvedValue(mockRawCompany);

      const result = await repository.delete('123456789');

      expect(result).toEqual(mockRawCompany);
      expect(prismaService.companies.delete).toHaveBeenCalledWith({
        where: { id: '123456789' },
      });
    });

    it('deve usar o ID correto na exclusão', async () => {
      prismaService.companies.delete.mockResolvedValue(mockRawCompany);

      await repository.delete('987654321');

      expect(prismaService.companies.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '987654321' },
        }),
      );
    });

    it('deve retornar a empresa deletada', async () => {
      prismaService.companies.delete.mockResolvedValue(mockRawCompany);

      const result = await repository.delete('123456789');

      expect(result).toBeDefined();
      expect(result.id).toBe('123456789');
      expect(result.cnpj).toBe('12345678000199');
    });

    it('deve usar o método delete do Prisma', async () => {
      prismaService.companies.delete.mockResolvedValue(mockRawCompany);

      await repository.delete('123456789');

      expect(prismaService.companies.delete).toHaveBeenCalled();
    });
  });
});
