import { identities } from '@repo/db';
import { Identity, IdentityProps } from '../../domain/entities/identity.entity';

export class IdentityMapper {
  static toDomain(raw: identities): Identity {
    const props: IdentityProps = {
      id: raw.id,
      personId: raw.person_id,
      email: raw.email,
      identityType: raw.identity_type,
      passwordHash: raw.password_hash,
      active: raw.active ?? true,
      emailVerified: raw.email_verified ?? false,
      emailVerificationToken: raw.email_verification_token,
      emailVerificationExpiresAt: raw.email_verification_expires_at,
      failedLoginAttempts: raw.failed_login_attempts ?? 0,
      lastFailedLogin: raw.last_failed_login,
      blockedUntil: raw.blocked_until,
      blockReason: raw.block_reason,
      lastLoginDate: raw.last_login_date,
      loginCount: raw.login_count ?? 0,
      passwordChangedAt: raw.password_changed_at,
      resetToken: raw.reset_token,
      resetTokenExpiresAt: raw.reset_token_expires_at,
      createdAt: raw.created_at ?? new Date(),
    };

    return Identity.create(props);
  }

  static toPrisma(identity: Identity): Partial<identities> {
    return {
      id: identity.id,
      person_id: identity.personId,
      email: identity.email,
      identity_type: identity.identityType,
      password_hash: identity.passwordHash,
      active: identity.active,
      email_verified: identity.emailVerified,
      email_verification_token: identity.emailVerificationToken,
      email_verification_expires_at: identity.emailVerificationExpiresAt,
      failed_login_attempts: identity.failedLoginAttempts,
      blocked_until: identity.blockedUntil,
      block_reason: identity.blockReason,
      last_login_date: identity.lastLoginDate,
      login_count: identity.loginCount,
      reset_token: identity.resetToken,
      reset_token_expires_at: identity.resetTokenExpiresAt,
    };
  }

  static toDomainList(raw: identities[]): Identity[] {
    return raw.map((item) => this.toDomain(item));
  }
}
