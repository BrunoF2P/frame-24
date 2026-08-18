import { Test, TestingModule } from '@nestjs/testing';
import { IdentityRepository } from './identity.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { Identity } from '../domain/entities/identity.entity';
import { IdentityMapper } from '../infraestructure/mappers/indentity.mapper';
import { identities, $Enums } from '@repo/db';
import { SnowflakeService } from 'src/common/services/snowflake.service';

type MockPrismaService = {
  identities: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
};

describe('IdentityRepository', () => {
  let repository: IdentityRepository;
  let prismaService: MockPrismaService;

  const mockRawIdentity: identities = {
    id: '123456789',
    person_id: 'person-123',
    email: 'joao@example.com',
    identity_type: 'EMPLOYEE' as $Enums.identity_type,
    password_hash: 'hashed_password',
    active: true,
    email_verified: false,
    email_verification_token: 'token123',
    email_verification_expires_at: new Date(Date.now() + 86400000),
    reset_token: null,
    reset_token_expires_at: null,
    failed_login_attempts: 0,
    last_failed_login: null,
    blocked_until: null,
    block_reason: null,
    last_login_date: null,
    login_count: 0,
    external_id: null,
    password_expires_at: null,
    requires_2fa: false,
    secret_2fa: null,
    backup_codes_2fa: null,
    last_login_ip: null,
    last_user_agent: null,
    linked_identity_id: null,
    password_changed_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockDomainIdentity: Identity = {
    id: '123456789',
    personId: 'person-123',
    email: 'joao@example.com',
    identityType: 'EMPLOYEE',
    passwordHash: 'hashed_password',
    active: true,
    emailVerified: false,
    emailVerificationToken: 'token123',
    emailVerificationExpiresAt: new Date(Date.now() + 86400000),
    resetToken: null,
    resetTokenExpiresAt: null,
    failedLoginAttempts: 0,
    lastFailedLogin: null,
    blockedUntil: null,
    blockReason: null,
    lastLoginDate: null,
    loginCount: 0,
    passwordChangedAt: null,
    externalId: null,
    passwordExpiresAt: null,
    requires2fa: false,
    backupCodes2fa: null,
    lastLoginIp: null,
    lastUserAgent: null,
    linkedIdentityId: null,
    secret2fa: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Identity;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdentityRepository,
        {
          provide: PrismaService,
          useValue: {
            identities: {
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
            generate: jest.fn().mockReturnValue('snowflake-id'),
          },
        },
      ],
    }).compile();

    repository = module.get<IdentityRepository>(IdentityRepository);
    prismaService = module.get(PrismaService);

    jest.spyOn(IdentityMapper, 'toDomain').mockReturnValue(mockDomainIdentity);
    jest
      .spyOn(IdentityMapper, 'toPrisma')
      .mockReturnValue(mockRawIdentity as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(repository).toBeDefined();
  });

  describe('findByEmail', () => {
    it('deve retornar Identity do domínio quando encontrada', async () => {
      prismaService.identities.findFirst.mockResolvedValue(mockRawIdentity);

      const result = await repository.findByEmail('joao@example.com');

      expect(result).toEqual(mockDomainIdentity);
      expect(prismaService.identities.findFirst).toHaveBeenCalledWith({
        where: { email: 'joao@example.com' },
      });
      expect(IdentityMapper.toDomain).toHaveBeenCalledWith(mockRawIdentity);
    });

    it('deve retornar null quando não encontrada', async () => {
      prismaService.identities.findFirst.mockResolvedValue(null);

      const result = await repository.findByEmail('inexistente@example.com');

      expect(result).toBeNull();
      expect(IdentityMapper.toDomain).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('deve retornar Identity quando encontrada', async () => {
      prismaService.identities.findUnique.mockResolvedValue(mockRawIdentity);

      const result = await repository.findById('123456789');

      expect(result).toEqual(mockDomainIdentity);
      expect(prismaService.identities.findUnique).toHaveBeenCalledWith({
        where: { id: '123456789' },
      });
    });

    it('deve retornar null quando não encontrada', async () => {
      prismaService.identities.findUnique.mockResolvedValue(null);

      const result = await repository.findById('id-inexistente');

      expect(result).toBeNull();
    });
  });

  describe('findByEmailAndCompany', () => {
    it('deve buscar por email, company e tipo', async () => {
      prismaService.identities.findFirst.mockResolvedValue(mockRawIdentity);

      const result = await repository.findByEmailAndCompany(
        'joao@example.com',
        'company-456',
        'EMPLOYEE',
      );

      expect(result).toEqual(mockDomainIdentity);
      expect(prismaService.identities.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'joao@example.com',
          identity_type: 'EMPLOYEE',
          company_users: {
            some: { company_id: 'company-456' },
          },
        },
      });
    });

    it('deve buscar sem filtro de empresa quando não fornecido', async () => {
      prismaService.identities.findFirst.mockResolvedValue(mockRawIdentity);

      await repository.findByEmailAndCompany(
        'joao@example.com',
        undefined,
        'EMPLOYEE',
      );

      expect(prismaService.identities.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'joao@example.com',
          identity_type: 'EMPLOYEE',
        },
      });
    });

    it('deve retornar null quando não encontrada', async () => {
      prismaService.identities.findFirst.mockResolvedValue(null);

      const result = await repository.findByEmailAndCompany(
        'joao@example.com',
        'company-456',
        'EMPLOYEE',
      );

      expect(result).toBeNull();
    });
  });

  describe('findByVerificationToken', () => {
    it('deve retornar Identity quando token encontrado', async () => {
      prismaService.identities.findFirst.mockResolvedValue(mockRawIdentity);

      const result = await repository.findByVerificationToken('token123');

      expect(result).toEqual(mockDomainIdentity);
      expect(prismaService.identities.findFirst).toHaveBeenCalledWith({
        where: { email_verification_token: 'token123' },
      });
    });

    it('deve retornar null quando token não encontrado', async () => {
      prismaService.identities.findFirst.mockResolvedValue(null);

      const result = await repository.findByVerificationToken('token-invalido');

      expect(result).toBeNull();
    });
  });

  describe('findByPasswordResetToken', () => {
    it('deve retornar Identity quando reset token encontrado', async () => {
      prismaService.identities.findFirst.mockResolvedValue(mockRawIdentity);

      const result =
        await repository.findByPasswordResetToken('reset-token-123');

      expect(result).toEqual(mockDomainIdentity);
      expect(prismaService.identities.findFirst).toHaveBeenCalledWith({
        where: { reset_token: 'reset-token-123' },
      });
    });

    it('deve retornar null quando token não encontrado', async () => {
      prismaService.identities.findFirst.mockResolvedValue(null);

      const result =
        await repository.findByPasswordResetToken('token-invalido');

      expect(result).toBeNull();
    });
  });

  describe('createWithVerification', () => {
    it('deve criar identidade com verificação', async () => {
      prismaService.identities.create.mockResolvedValue(mockRawIdentity);
      const verificationDate = new Date(Date.now() + 86400000);

      const result = await repository.createWithVerification({
        personId: 'person-123',
        email: 'novo@example.com',
        passwordHash: 'hashed',
        verificationToken: 'token123',
        verificationExpiresAt: verificationDate,
      });

      expect(result).toEqual(mockDomainIdentity);
      expect(prismaService.identities.create).toHaveBeenCalledWith({
        data: {
          id: 'snowflake-id',
          persons: { connect: { id: 'person-123' } },
          email: 'novo@example.com',
          identity_type: 'EMPLOYEE',
          password_hash: 'hashed',
          active: true,
          email_verified: true,
          email_verification_token: 'token123',
          email_verification_expires_at: verificationDate,
        },
      });
    });
  });

  describe('createEmployee', () => {
    it('deve criar employee', async () => {
      prismaService.identities.create.mockResolvedValue(mockRawIdentity);

      const result = await repository.createEmployee({
        personId: 'person-123',
        email: 'employee@example.com',
        passwordHash: 'hashed',
        active: true,
      });

      expect(result).toEqual(mockDomainIdentity);
      expect(prismaService.identities.create).toHaveBeenCalledWith({
        data: {
          id: 'snowflake-id',
          persons: { connect: { id: 'person-123' } },
          email: 'employee@example.com',
          identity_type: 'EMPLOYEE',
          password_hash: 'hashed',
          active: true,
          email_verified: false,
        },
      });
    });
  });

  describe('updateEmailVerification', () => {
    it('deve atualizar verificação de email', async () => {
      prismaService.identities.update.mockResolvedValue(mockRawIdentity);

      const result = await repository.updateEmailVerification('123456789', {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      });

      expect(result).toEqual(mockDomainIdentity);
      expect(prismaService.identities.update).toHaveBeenCalledWith({
        where: { id: '123456789' },
        data: {
          email_verified: true,
          email_verification_token: null,
          email_verification_expires_at: null,
        },
      });
    });
  });

  describe('updateEmail', () => {
    it('deve atualizar email e marcar como não verificado', async () => {
      prismaService.identities.update.mockResolvedValue(mockRawIdentity);

      const result = await repository.updateEmail(
        '123456789',
        'novo@example.com',
      );

      expect(result).toEqual(mockDomainIdentity);
      expect(prismaService.identities.update).toHaveBeenCalledWith({
        where: { id: '123456789' },
        data: {
          email: 'novo@example.com',
          email_verified: false,
        },
      });
    });
  });

  describe('updateLoginTracking', () => {
    it('deve atualizar rastreamento de login', async () => {
      prismaService.identities.update.mockResolvedValue(mockRawIdentity);
      const loginDate = new Date();

      const result = await repository.updateLoginTracking('123456789', {
        lastLoginDate: loginDate,
        loginCount: 5,
      });

      expect(result).toEqual(mockDomainIdentity);
      expect(prismaService.identities.update).toHaveBeenCalledWith({
        where: { id: '123456789' },
        data: {
          last_login_date: loginDate,
          login_count: 5,
        },
      });
    });
  });

  describe('updateLoginAttempts', () => {
    it('deve atualizar tentativas de login', async () => {
      prismaService.identities.update.mockResolvedValue(mockRawIdentity);
      const failedDate = new Date();

      const result = await repository.updateLoginAttempts('123456789', {
        failedLoginAttempts: 3,
        lastFailedLogin: failedDate,
      });

      expect(result).toEqual(mockDomainIdentity);
      expect(prismaService.identities.update).toHaveBeenCalledWith({
        where: { id: '123456789' },
        data: {
          failed_login_attempts: 3,
          last_failed_login: failedDate,
          blocked_until: undefined,
          block_reason: undefined,
        },
      });
    });
  });

  describe('updatePasswordReset', () => {
    it('deve atualizar token de reset de senha', async () => {
      prismaService.identities.update.mockResolvedValue(mockRawIdentity);
      const expiresAt = new Date(Date.now() + 3600000);

      const result = await repository.updatePasswordReset('123456789', {
        resetToken: 'reset-token-123',
        resetTokenExpiresAt: expiresAt,
      });

      expect(result).toEqual(mockDomainIdentity);
      expect(prismaService.identities.update).toHaveBeenCalledWith({
        where: { id: '123456789' },
        data: {
          reset_token: 'reset-token-123',
          reset_token_expires_at: expiresAt,
        },
      });
    });
  });

  describe('completePasswordReset', () => {
    it('deve completar reset de senha limpando tokens e tentativas', async () => {
      prismaService.identities.update.mockResolvedValue(mockRawIdentity);
      const changedAt = new Date();

      const result = await repository.completePasswordReset('123456789', {
        passwordHash: 'new-hash',
        passwordChangedAt: changedAt,
      });

      expect(result).toEqual(mockDomainIdentity);
      expect(prismaService.identities.update).toHaveBeenCalledWith({
        where: { id: '123456789' },
        data: {
          password_hash: 'new-hash',
          password_changed_at: changedAt,
          reset_token: null,
          reset_token_expires_at: null,
          failed_login_attempts: 0,
          blocked_until: null,
          block_reason: null,
        },
      });
    });
  });

  describe('save', () => {
    it('deve salvar entidade de domínio usando mapper', async () => {
      prismaService.identities.update.mockResolvedValue(mockRawIdentity);

      const result = await repository.save(mockDomainIdentity);

      expect(result).toEqual(mockDomainIdentity);
      expect(IdentityMapper.toPrisma).toHaveBeenCalledWith(mockDomainIdentity);
      expect(prismaService.identities.update).toHaveBeenCalledWith({
        where: { id: mockDomainIdentity.id },
        data: mockRawIdentity,
      });
    });
  });

  describe('delete', () => {
    it('deve deletar identidade', async () => {
      prismaService.identities.delete.mockResolvedValue(mockRawIdentity);

      await repository.delete('123456789');

      expect(prismaService.identities.delete).toHaveBeenCalledWith({
        where: { id: '123456789' },
      });
    });
  });
});
