import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import jwksRsa from 'jwks-rsa';
import jwt from 'jsonwebtoken';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoggerService } from 'src/common/services/logger.service';
import {
  BackchannelLogoutDto,
  CheckOidcSessionDto,
  type OidcSessionContext,
  RegisterOidcSessionDto,
} from '../dto/internal-oidc-session.dto';

interface JwtHeaderWithKid {
  kid?: string;
}

interface LogoutTokenPayload {
  iss?: string;
  aud?: string | string[];
  sub?: string;
  sid?: string;
  events?: Record<string, unknown>;
  nonce?: string;
  iat?: number;
  jti?: string;
}

const BACKCHANNEL_LOGOUT_EVENT =
  'http://schemas.openid.net/event/backchannel-logout';

@Injectable()
export class OidcSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private async resolveIdentity(subject: string) {
    return this.prisma.identities.findFirst({
      where: {
        external_id: subject,
        active: true,
      },
      include: {
        company_users: {
          where: { active: true },
          orderBy: { created_at: 'asc' },
          take: 1,
        },
      },
    });
  }

  private async resolveCompanyId(
    subject: string,
    context: OidcSessionContext,
  ): Promise<string | undefined> {
    const identity = await this.resolveIdentity(subject);

    if (!identity) {
      throw new BadRequestException('Identity not found for OIDC session.');
    }

    if (context === 'EMPLOYEE') {
      return identity.company_users[0]?.company_id ?? undefined;
    }

    const customer = await this.prisma.customers.findFirst({
      where: {
        identity_id: identity.id,
        active: true,
        blocked: false,
      },
      include: {
        company_customers: {
          where: { is_active_in_loyalty: true },
          orderBy: { created_at: 'asc' },
          take: 1,
        },
      },
    });

    return customer?.company_customers[0]?.company_id ?? undefined;
  }

  async registerSession(dto: RegisterOidcSessionDto) {
    const identity = await this.resolveIdentity(dto.subject);
    if (!identity) {
      throw new BadRequestException('Identity not found for OIDC session.');
    }

    const companyId = await this.resolveCompanyId(dto.subject, dto.context);
    const expiresAt = dto.expires_at
      ? new Date(dto.expires_at)
      : new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

    await this.prisma.user_sessions.upsert({
      where: {
        session_id: dto.session_id,
      },
      update: {
        identity_id: identity.id,
        company_id: companyId,
        session_context: dto.context,
        expires_at: expiresAt,
        access_token_hash: this.hash(dto.session_id),
        active: true,
        revoked: false,
        revoked_at: null,
        last_activity: new Date(),
      },
      create: {
        identity_id: identity.id,
        company_id: companyId,
        session_context: dto.context,
        session_id: dto.session_id,
        expires_at: expiresAt,
        access_token_hash: this.hash(dto.session_id),
        active: true,
        revoked: false,
        last_activity: new Date(),
      },
    });

    return { success: true };
  }

  async isSessionActive(dto: CheckOidcSessionDto) {
    if (!dto.session_id && !dto.subject) {
      throw new BadRequestException('session_id or subject is required.');
    }

    if (dto.session_id) {
      const session = await this.prisma.user_sessions.findUnique({
        where: { session_id: dto.session_id },
      });

      if (!session) {
        return { active: false };
      }

      const active =
        session.active === true &&
        session.revoked !== true &&
        session.expires_at > new Date();

      return { active };
    }

    const identity = await this.prisma.identities.findFirst({
      where: {
        external_id: dto.subject,
        active: true,
      },
    });

    if (!identity) {
      return { active: false };
    }

    const activeSessions = await this.prisma.user_sessions.count({
      where: {
        identity_id: identity.id,
        active: true,
        revoked: false,
        expires_at: { gt: new Date() },
      },
    });

    return { active: activeSessions > 0 };
  }

  private async getSigningKey(issuer: string, kid: string): Promise<string> {
    const client = jwksRsa({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 10,
      jwksUri: new URL('./jwks/', issuer).toString(),
    });

    const key = await client.getSigningKey(kid);
    return key.getPublicKey();
  }

  async revokeFromBackchannel(dto: BackchannelLogoutDto) {
    const decoded = jwt.decode(dto.logout_token, {
      complete: true,
    }) as { header?: JwtHeaderWithKid; payload?: LogoutTokenPayload } | null;

    const issuer =
      dto.issuer ??
      decoded?.payload?.iss ??
      process.env.OIDC_ISSUER ??
      process.env.KEYCLOAK_ISSUER;

    if (!issuer) {
      throw new BadRequestException('OIDC issuer not configured.');
    }

    const kid = decoded?.header?.kid;
    if (!kid) {
      throw new BadRequestException('Missing kid in logout token.');
    }

    const publicKey = await this.getSigningKey(issuer, kid);

    const payload = jwt.verify(dto.logout_token, publicKey, {
      algorithms: ['RS256'],
      issuer,
      audience: dto.expected_audience,
    }) as LogoutTokenPayload;

    if (!payload.events?.[BACKCHANNEL_LOGOUT_EVENT]) {
      throw new UnauthorizedException('Invalid backchannel logout event.');
    }

    if (payload.nonce) {
      throw new UnauthorizedException('Logout token must not contain nonce.');
    }

    if (payload.sid) {
      const session = await this.prisma.user_sessions.findUnique({
        where: {
          session_id: payload.sid,
        },
      });

      if (!session) {
        return { success: true, revoked_by: 'sid', sessions: 0 };
      }

      await this.prisma.user_sessions.updateMany({
        where: {
          session_id: payload.sid,
          company_id: session.company_id,
          active: true,
        },
        data: {
          revoked: true,
          revoked_at: new Date(),
          active: false,
        },
      });

      this.logger.log(
        `OIDC backchannel logout applied to sid ${payload.sid}.`,
        OidcSessionService.name,
      );

      return { success: true, revoked_by: 'sid' };
    }

    if (!payload.sub) {
      throw new BadRequestException('Logout token must contain sid or sub.');
    }

    const identity = await this.prisma.identities.findFirst({
      where: {
        external_id: payload.sub,
        active: true,
      },
    });

    if (!identity) {
      return { success: true, revoked_by: 'subject', sessions: 0 };
    }

    const sessions = await this.prisma.user_sessions.findMany({
      where: {
        identity_id: identity.id,
        active: true,
      },
      select: {
        company_id: true,
      },
      distinct: ['company_id'],
    });

    let revokedSessions = 0;

    for (const session of sessions) {
      const result = await this.prisma.user_sessions.updateMany({
        where: {
          identity_id: identity.id,
          company_id: session.company_id,
          active: true,
        },
        data: {
          revoked: true,
          revoked_at: new Date(),
          active: false,
        },
      });

      revokedSessions += result.count;
    }

    this.logger.log(
      `OIDC backchannel logout applied to subject ${payload.sub}.`,
      OidcSessionService.name,
    );

    return { success: true, revoked_by: 'subject', sessions: revokedSessions };
  }
}
