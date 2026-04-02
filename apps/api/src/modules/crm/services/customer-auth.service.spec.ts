/// <reference types="jest" />

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _key: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CustomerAuthService } from './customer-auth.service';
import { CustomersRepository } from '../repositories/customers.repository';
import { CompanyCustomersRepository } from '../repositories/company-customers.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { SnowflakeService } from '../../../common/services/snowflake.service';
import { LoggerService } from '../../../common/services/logger.service';
import { KeycloakProvisioningService } from '../../../common/services/keycloak-provisioning.service';

describe('CustomerAuthService', () => {
  let service: CustomerAuthService;
  let customersRepository: jest.Mocked<CustomersRepository>;
  let companyCustomersRepository: jest.Mocked<CompanyCustomersRepository>;
  let prisma: jest.Mocked<PrismaService>;
  let snowflake: jest.Mocked<SnowflakeService>;
  let logger: jest.Mocked<LoggerService>;
  let keycloakProvisioning: jest.Mocked<KeycloakProvisioningService>;

  beforeEach(() => {
    customersRepository = {
      findByEmail: jest.fn(),
      findByCpf: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<CustomersRepository>;

    companyCustomersRepository = {
      create: jest.fn(),
    } as unknown as jest.Mocked<CompanyCustomersRepository>;

    prisma = {
      companies: {
        findUnique: jest.fn(),
      },
      identities: {
        create: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    snowflake = {
      generate: jest.fn().mockReturnValue('identity-1'),
    } as unknown as jest.Mocked<SnowflakeService>;

    logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;

    keycloakProvisioning = {
      createUser: jest.fn(),
      deleteUser: jest.fn(),
    } as unknown as jest.Mocked<KeycloakProvisioningService>;

    service = new CustomerAuthService(
      customersRepository,
      companyCustomersRepository,
      prisma,
      snowflake,
      logger,
      keycloakProvisioning,
    );
  });

  it('register should create customer and return onboarding payload', async () => {
    (prisma.companies.findUnique as jest.Mock).mockResolvedValue({
      id: 'company-1',
      active: true,
      suspended: false,
      tenant_slug: 'tenant-a',
    });
    customersRepository.findByEmail.mockResolvedValue(null as never);
    customersRepository.findByCpf.mockResolvedValue(null as never);
    keycloakProvisioning.createUser.mockResolvedValue('kc-user-1');
    (prisma.identities.create as jest.Mock).mockResolvedValue({
      id: 'identity-1',
    });
    customersRepository.create.mockResolvedValue({ id: 'customer-1' } as never);
    companyCustomersRepository.create.mockResolvedValue({} as never);

    const result = await service.register({
      company_id: 'company-1',
      email: 'maria@x.com',
      cpf: '12345678900',
      full_name: 'Maria',
      phone: '11999999999',
      password: 'StrongPass123',
      accepts_email: true,
      accepts_marketing: false,
      accepts_sms: false,
    } as any);

    expect(keycloakProvisioning.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'maria@x.com',
        fullName: 'Maria',
        realmRoles: ['FRAME24_CUSTOMER'],
      }),
    );
    expect(result).toEqual({
      success: true,
      message:
        'Cadastro realizado com sucesso. Faça login pelo Authentik para acessar sua conta.',
      customer_id: 'customer-1',
      tenant_slug: 'tenant-a',
      email: 'maria@x.com',
    });
  });

  it('register should reject duplicate email', async () => {
    (prisma.companies.findUnique as jest.Mock).mockResolvedValue({
      id: 'company-1',
      active: true,
      suspended: false,
    });
    customersRepository.findByEmail.mockResolvedValue({
      id: 'existing',
    } as never);

    await expect(
      service.register({
        company_id: 'company-1',
        email: 'maria@x.com',
        cpf: '12345678900',
      } as any),
    ).rejects.toThrow(ConflictException);
  });

  it('register should cleanup keycloak user if local persistence fails', async () => {
    (prisma.companies.findUnique as jest.Mock).mockResolvedValue({
      id: 'company-1',
      active: true,
      suspended: false,
    });
    customersRepository.findByEmail.mockResolvedValue(null as never);
    customersRepository.findByCpf.mockResolvedValue(null as never);
    keycloakProvisioning.createUser.mockResolvedValue('kc-user-1');
    (prisma.identities.create as jest.Mock).mockRejectedValue(
      new Error('db write failed'),
    );
    keycloakProvisioning.deleteUser.mockResolvedValue(undefined as never);

    await expect(
      service.register({
        company_id: 'company-1',
        email: 'maria@x.com',
        cpf: '12345678900',
        full_name: 'Maria',
        password: 'StrongPass123',
      } as any),
    ).rejects.toThrow('db write failed');

    expect(keycloakProvisioning.deleteUser).toHaveBeenCalledWith('kc-user-1');
  });

  it('register should keep original error when cleanup fails', async () => {
    const originalError = new Error('db write failed');

    (prisma.companies.findUnique as jest.Mock).mockResolvedValue({
      id: 'company-1',
      active: true,
      suspended: false,
    });
    customersRepository.findByEmail.mockResolvedValue(null as never);
    customersRepository.findByCpf.mockResolvedValue(null as never);
    keycloakProvisioning.createUser.mockResolvedValue('kc-user-1');
    (prisma.identities.create as jest.Mock).mockRejectedValue(originalError);
    keycloakProvisioning.deleteUser.mockRejectedValue(
      new Error('cleanup failed'),
    );

    await expect(
      service.register({
        company_id: 'company-1',
        email: 'maria@x.com',
        cpf: '12345678900',
        full_name: 'Maria',
        password: 'StrongPass123',
      } as any),
    ).rejects.toThrow('db write failed');
  });

  it('login should be disabled for credentials flow', async () => {
    (prisma.companies.findUnique as jest.Mock).mockResolvedValue({
      id: 'company-1',
      active: true,
      suspended: false,
    });

    await expect(
      service.login({
        company_id: 'company-1',
        email: 'maria@x.com',
        password: 'StrongPass123',
      } as any),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('login should reject when company is missing/inactive', async () => {
    (prisma.companies.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.login({
        company_id: 'company-1',
        email: 'maria@x.com',
        password: 'StrongPass123',
      } as any),
    ).rejects.toThrow(NotFoundException);
  });
});
