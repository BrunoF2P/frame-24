/// <reference types="jest" />

import { ConflictException } from '@nestjs/common';
import { PublicRegistrationService } from './public-registration.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CompanyService } from 'src/modules/identity/companies/services/company.service';
import { EmployeeIdGeneratorService } from './employee-id-generator';
import { MasterDataSetupService } from 'src/modules/setup/services/master-data-setup.service';
import { TaxSetupService } from 'src/modules/tax/services/tax-setup.service';
import { auth } from 'src/lib/auth';

jest.mock('src/lib/auth', () => ({
  auth: {
    api: {
      signUpEmail: jest.fn(),
    },
  },
}));

describe('PublicRegistrationService', () => {
  let service: PublicRegistrationService;
  let prisma: jest.Mocked<PrismaService>;
  let companyService: jest.Mocked<CompanyService>;
  let employeeIdGenerator: jest.Mocked<EmployeeIdGeneratorService>;
  let masterDataSetupService: jest.Mocked<MasterDataSetupService>;
  let taxSetupService: jest.Mocked<TaxSetupService>;
  const signUpEmailMock = auth.api.signUpEmail as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    prisma = {
      identities: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      persons: {
        create: jest.fn(),
      },
      custom_roles: {
        upsert: jest.fn(),
      },
      company_users: {
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    } as unknown as jest.Mocked<PrismaService>;

    companyService = {
      create: jest.fn(),
    } as unknown as jest.Mocked<CompanyService>;

    employeeIdGenerator = {
      generate: jest.fn(),
    } as unknown as jest.Mocked<EmployeeIdGeneratorService>;

    masterDataSetupService = {
      setupCompanyMasterData: jest.fn(),
    } as unknown as jest.Mocked<MasterDataSetupService>;

    taxSetupService = {
      setupCompanyTaxes: jest.fn(),
    } as unknown as jest.Mocked<TaxSetupService>;

    service = new PublicRegistrationService(
      prisma,
      companyService,
      employeeIdGenerator,
      masterDataSetupService,
      taxSetupService,
    );
  });

  it('register should reject duplicate identity email', async () => {
    (prisma.identities.findFirst as jest.Mock).mockResolvedValue({
      id: 'identity-1',
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.register({
        email: 'dup@x.com',
      } as any),
    ).rejects.toThrow(ConflictException);
  });

  it('register should reject duplicate Better Auth email', async () => {
    (prisma.identities.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'auth-user-existing',
    });

    await expect(
      service.register({
        email: 'dup@x.com',
      } as any),
    ).rejects.toThrow(ConflictException);
  });

  it('register should create company, identity and admin user', async () => {
    (prisma.identities.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    companyService.create.mockResolvedValue({
      id: 'company-1',
      tenant_slug: 'tenant-1',
      tax_regime: 'SIMPLES_NACIONAL',
    } as any);
    signUpEmailMock.mockResolvedValue({
      user: { id: 'auth-user-1' },
      token: null,
    });
    (prisma.persons.create as jest.Mock).mockResolvedValue({
      id: 'person-1',
    });
    (prisma.identities.create as jest.Mock).mockResolvedValue({
      id: 'identity-1',
    });
    (prisma.custom_roles.upsert as jest.Mock).mockResolvedValue({
      id: 'role-1',
    });
    employeeIdGenerator.generate.mockResolvedValue('EMP-0001');
    (prisma.company_users.create as jest.Mock).mockResolvedValue({
      id: 'company-user-1',
    });
    (prisma.$transaction as jest.Mock).mockImplementation(
      (callback: (tx: PrismaService) => unknown) => callback(prisma),
    );

    const result = await service.register({
      corporate_name: 'Cinema ABC',
      trade_name: 'Cinema ABC',
      cnpj: '12345678000195',
      full_name: 'Maria Souza',
      email: ' Maria@X.com ',
      password: 'StrongPass123',
      plan_type: 'BASIC',
      company_city: 'Sao Paulo',
      company_state: 'SP',
      company_zip_code: '01310100',
    } as any);

    expect(masterDataSetupService.setupCompanyMasterData).toHaveBeenCalledWith(
      'company-1',
    );
    expect(auth.api.signUpEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          name: 'Maria Souza',
          email: 'maria@x.com',
        }),
      }),
    );
    expect(taxSetupService.setupCompanyTaxes).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company-1',
      }),
    );
    expect(prisma.company_users.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          company_id: 'company-1',
          identity_id: 'identity-1',
          role_id: 'role-1',
          employee_id: 'EMP-0001',
        }),
      }),
    );
    expect(result).toEqual({
      success: true,
      message:
        'Cadastro realizado com sucesso. Verifique seu email e redefina sua senha no primeiro acesso.',
      company_id: 'company-1',
      tenant_slug: 'tenant-1',
      email: 'maria@x.com',
    });
  });

  it('register should propagate local registration errors', async () => {
    (prisma.identities.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    companyService.create.mockRejectedValue(new Error('company create failed'));

    await expect(
      service.register({
        corporate_name: 'Cinema ABC',
        cnpj: '12345678000195',
        full_name: 'Maria Souza',
        email: 'maria@x.com',
        password: 'StrongPass123',
      } as any),
    ).rejects.toThrow('company create failed');
  });

  it('register should rollback Better Auth user when local transaction fails', async () => {
    (prisma.identities.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    companyService.create.mockResolvedValue({
      id: 'company-1',
      tenant_slug: 'tenant-1',
      tax_regime: 'SIMPLES_NACIONAL',
    } as any);
    signUpEmailMock.mockResolvedValue({
      user: { id: 'auth-user-rollback' },
      token: null,
    });
    (prisma.$transaction as jest.Mock).mockRejectedValue(
      new Error('transaction failed'),
    );
    (prisma.user.delete as jest.Mock).mockResolvedValue({ id: 'deleted' });

    await expect(
      service.register({
        corporate_name: 'Cinema ABC',
        cnpj: '12345678000195',
        full_name: 'Maria Souza',
        email: 'maria@x.com',
        password: 'StrongPass123',
      } as any),
    ).rejects.toThrow('transaction failed');

    expect(prisma.user.delete).toHaveBeenCalledWith({
      where: { id: 'auth-user-rollback' },
    });
  });
});
