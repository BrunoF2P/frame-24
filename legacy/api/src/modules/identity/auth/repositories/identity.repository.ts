import { Injectable } from '@nestjs/common';
import { $Enums } from '@repo/db';
import { Identity } from '../domain/entities/identity.entity';
import { PrismaService } from 'src/prisma/prisma.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { IdentityMapper } from 'src/modules/identity/auth/infraestructure/mappers/indentity.mapper';

type IdentityType = $Enums.identity_type;

@Injectable()
export class IdentityRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflake: SnowflakeService,
  ) {}

  async findByEmail(email: string): Promise<Identity | null> {
    const raw = await this.prisma.identities.findFirst({ where: { email } });
    return raw ? IdentityMapper.toDomain(raw) : null;
  }

  async findById(id: string): Promise<Identity | null> {
    const raw = await this.prisma.identities.findUnique({ where: { id } });
    return raw ? IdentityMapper.toDomain(raw) : null;
  }

  async findByEmailAndCompany(
    email: string,
    companyId: string | undefined,
    identityType: IdentityType,
  ): Promise<Identity | null> {
    const raw = await this.prisma.identities.findFirst({
      where: {
        email,
        identity_type: identityType,
        ...(companyId
          ? { company_users: { some: { company_id: companyId } } }
          : {}),
      },
    });
    return raw ? IdentityMapper.toDomain(raw) : null;
  }

  async findByVerificationToken(token: string): Promise<Identity | null> {
    const raw = await this.prisma.identities.findFirst({
      where: { email_verification_token: token },
    });
    return raw ? IdentityMapper.toDomain(raw) : null;
  }

  async findByPasswordResetToken(token: string): Promise<Identity | null> {
    const raw = await this.prisma.identities.findFirst({
      where: { reset_token: token },
    });
    return raw ? IdentityMapper.toDomain(raw) : null;
  }

  async createWithVerification(data: {
    personId: string;
    email: string;
    passwordHash: string;
    verificationToken: string;
    verificationExpiresAt: Date;
  }): Promise<Identity> {
    const raw = await this.prisma.identities.create({
      data: {
        id: this.snowflake.generate(),
        persons: { connect: { id: data.personId } },
        email: data.email,
        identity_type: 'EMPLOYEE',
        password_hash: data.passwordHash,
        active: true,
        email_verified: true,
        email_verification_token: data.verificationToken,
        email_verification_expires_at: data.verificationExpiresAt,
      },
    });

    return IdentityMapper.toDomain(raw);
  }

  async createEmployee(data: {
    personId: string;
    email: string;
    passwordHash: string;
    active: boolean;
  }): Promise<Identity> {
    const raw = await this.prisma.identities.create({
      data: {
        id: this.snowflake.generate(),
        persons: { connect: { id: data.personId } },
        email: data.email,
        identity_type: 'EMPLOYEE',
        password_hash: data.passwordHash,
        active: data.active,
        email_verified: false,
      },
    });

    return IdentityMapper.toDomain(raw);
  }

  async updateEmailVerification(
    id: string,
    data: {
      emailVerified: boolean;
      emailVerificationToken: string | null;
      emailVerificationExpiresAt: Date | null;
    },
  ): Promise<Identity> {
    const raw = await this.prisma.identities.update({
      where: { id },
      data: {
        email_verified: data.emailVerified,
        email_verification_token: data.emailVerificationToken,
        email_verification_expires_at: data.emailVerificationExpiresAt,
      },
    });

    return IdentityMapper.toDomain(raw);
  }

  async updateEmail(id: string, email: string): Promise<Identity> {
    const raw = await this.prisma.identities.update({
      where: { id },
      data: { email, email_verified: false },
    });

    return IdentityMapper.toDomain(raw);
  }

  async updateLoginTracking(
    id: string,
    data: { lastLoginDate: Date; loginCount: number },
  ): Promise<Identity> {
    const raw = await this.prisma.identities.update({
      where: { id },
      data: {
        last_login_date: data.lastLoginDate,
        login_count: data.loginCount,
      },
    });

    return IdentityMapper.toDomain(raw);
  }

  async updateLoginAttempts(
    id: string,
    data: {
      failedLoginAttempts: number;
      lastFailedLogin: Date | null;
      blockedUntil?: Date | null;
      blockReason?: string | null;
    },
  ): Promise<Identity> {
    const raw = await this.prisma.identities.update({
      where: { id },
      data: {
        failed_login_attempts: data.failedLoginAttempts,
        last_failed_login: data.lastFailedLogin,
        ...(data.blockedUntil !== undefined && {
          blocked_until: data.blockedUntil,
        }),
        ...(data.blockReason !== undefined && {
          block_reason: data.blockReason,
        }),
      },
    });

    return IdentityMapper.toDomain(raw);
  }

  async updatePasswordReset(
    id: string,
    data: { resetToken: string; resetTokenExpiresAt: Date },
  ): Promise<Identity> {
    const raw = await this.prisma.identities.update({
      where: { id },
      data: {
        reset_token: data.resetToken,
        reset_token_expires_at: data.resetTokenExpiresAt,
      },
    });

    return IdentityMapper.toDomain(raw);
  }

  async completePasswordReset(
    id: string,
    data: { passwordHash: string; passwordChangedAt: Date },
  ): Promise<Identity> {
    const raw = await this.prisma.identities.update({
      where: { id },
      data: {
        password_hash: data.passwordHash,
        password_changed_at: data.passwordChangedAt,
        reset_token: null,
        reset_token_expires_at: null,
        failed_login_attempts: 0,
        blocked_until: null,
        block_reason: null,
      },
    });

    return IdentityMapper.toDomain(raw);
  }

  async save(identity: Identity): Promise<Identity> {
    const prismaData = IdentityMapper.toPrisma(identity);
    const raw = await this.prisma.identities.update({
      where: { id: identity.id },
      data: prismaData,
    });
    return IdentityMapper.toDomain(raw);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.identities.delete({ where: { id } });
  }

  async revokeUserSessions(
    identityId: string,
    companyId?: string,
  ): Promise<void> {
    await this.prisma.user_sessions.updateMany({
      where: {
        identity_id: identityId,
        ...(companyId && { company_id: companyId }),
        active: true,
      },
      data: {
        revoked: true,
        revoked_at: new Date(),
        active: false,
      },
    });
  }

  async revokeSessionById(sessionId: string): Promise<void> {
    await this.prisma.user_sessions.update({
      where: { id: sessionId },
      data: {
        revoked: true,
        revoked_at: new Date(),
        active: false,
      },
    });
  }
}
