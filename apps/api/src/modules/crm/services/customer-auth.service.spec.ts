/// <reference types="jest" />

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _key: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));
jest.mock('src/lib/auth', () => ({
  auth: {
    api: {
      signUpEmail: jest.fn().mockResolvedValue({ user: { id: 'auth-user-1' } }),
    },
  },
}));

import { ConflictException, NotFoundException } from '@nestjs/common';
import { CustomerAuthService } from './customer-auth.service';
import { CustomersRepository } from '../repositories/customers.repository';
import { CompanyCustomersRepository } from '../repositories/company-customers.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { SnowflakeService } from '../../../common/services/snowflake.service';
import { LoggerService } from '../../../common/services/logger.service';

describe('CustomerAuthService', () => {
  let service: CustomerAuthService;
  let customersRepository: jest.Mocked<CustomersRepository>;
  let companyCustomersRepository: jest.Mocked<CompanyCustomersRepository>;
  let prisma: jest.Mocked<PrismaService>;
  let snowflake: jest.Mocked<SnowflakeService>;
  let logger: jest.Mocked<LoggerService>;

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
        findFirst: jest.fn(),
      },
      customers: {
        findFirst: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        delete: jest.fn().mockResolvedValue({}),
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

    service = new CustomerAuthService(
      customersRepository,
      companyCustomersRepository,
      prisma,
      snowflake,
      logger,
    );
  });

  it('register should create customer and return onboarding payload', async () => {
    (prisma.companies.findFirst as jest.Mock).mockResolvedValue({
      id: 'company-1',
      active: true,
      suspended: false,
      tenant_slug: 'tenant-a',
    });
    (prisma.customers.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
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

    expect(result).toEqual({
      success: true,
      message:
        'Cadastro realizado com sucesso. Faça login para acessar sua conta.',
      customer_id: 'customer-1',
      tenant_slug: 'tenant-a',
      email: 'maria@x.com',
    });
  });

  it('register should reject duplicate email', async () => {
    (prisma.companies.findFirst as jest.Mock).mockResolvedValue({
      id: 'company-1',
      active: true,
      suspended: false,
      tenant_slug: 'tenant-a',
    });
    (prisma.customers.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 'existing',
    });

    await expect(
      service.register({
        company_id: 'company-1',
        email: 'maria@x.com',
        cpf: '12345678900',
      } as any),
    ).rejects.toThrow(ConflictException);
  });

  it('register should propagate local persistence error', async () => {
    (prisma.companies.findFirst as jest.Mock).mockResolvedValue({
      id: 'company-1',
      active: true,
      suspended: false,
      tenant_slug: 'tenant-a',
    });
    (prisma.customers.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.identities.create as jest.Mock).mockRejectedValue(
      new Error('db write failed'),
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

  it('register should reject when company is missing/inactive', async () => {
    (prisma.companies.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      service.register({
        company_id: 'company-1',
        email: 'maria@x.com',
        cpf: '12345678900',
        full_name: 'Maria',
        password: 'StrongPass123',
      } as any),
    ).rejects.toThrow(NotFoundException);
  });
});
