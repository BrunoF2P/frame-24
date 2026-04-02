import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as jwksRsa from 'jwks-rsa';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoggerService } from 'src/common/services/logger.service';
import type { RequestUser, CustomerUser } from '../types/auth-user.types';
import type { StrategyOptionsWithoutRequest } from 'passport-jwt';

interface KeycloakJwtPayload {
  sub: string;
  email?: string;
  preferred_username?: string;
  company_id?: string;
  tenant_slug?: string;
}

function isKeycloakEnabled(): boolean {
  return (
    process.env.AUTH_PROVIDER === 'keycloak' ||
    process.env.AUTH_PROVIDER === 'authentik' ||
    process.env.AUTH_PROVIDER === 'oidc' ||
    process.env.AUTH_PROVIDER === 'hybrid'
  );
}

function getOidcIssuer(): string | undefined {
  return process.env.OIDC_ISSUER || process.env.KEYCLOAK_ISSUER;
}

function getOidcAudience(): string | undefined {
  return process.env.OIDC_API_AUDIENCE || process.env.KEYCLOAK_API_AUDIENCE;
}

function getOidcJwksUri(issuer?: string): string | undefined {
  return (
    process.env.OIDC_JWKS_URI ||
    (issuer ? new URL('./jwks/', issuer).toString() : undefined)
  );
}

function buildStrategyOptions(): StrategyOptionsWithoutRequest {
  const enabled = isKeycloakEnabled();
  const issuer = getOidcIssuer();
  const audience = getOidcAudience();
  const jwksUri = getOidcJwksUri(issuer);

  if (!enabled || !issuer || !audience || !jwksUri) {
    // Keep strategy registered without breaking startup in legacy mode.
    return {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'disabled-keycloak-strategy',
    };
  }

  return {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    ignoreExpiration: false,
    issuer,
    audience,
    algorithms: ['RS256'],
    secretOrKeyProvider: jwksRsa.passportJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 10,
      jwksUri,
    }) as unknown as (
      req: unknown,
      rawJwtToken: string,
      done: (err: unknown, secret?: string | Buffer) => void,
    ) => void,
  };
}

@Injectable()
export class KeycloakJwtStrategy extends PassportStrategy(
  Strategy,
  'keycloak-jwt',
) {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {
    super(buildStrategyOptions());
  }

  async validate(
    payload: KeycloakJwtPayload,
  ): Promise<RequestUser | CustomerUser> {
    if (!isKeycloakEnabled()) {
      throw new UnauthorizedException('OIDC auth provider not enabled');
    }

    if (!payload.sub) {
      throw new UnauthorizedException('Invalid OIDC token payload');
    }

    const identity = await this.prisma.identities.findFirst({
      where: {
        external_id: payload.sub,
        active: true,
      },
      include: {
        persons: true,
        company_users: {
          where: payload.company_id
            ? {
                company_id: payload.company_id,
                active: true,
              }
            : {
                active: true,
              },
          include: {
            companies: true,
            custom_roles: {
              include: {
                role_permissions: {
                  include: {
                    permissions: true,
                  },
                },
              },
            },
          },
          orderBy: {
            created_at: 'asc',
          },
          take: 1,
        },
      },
    });

    if (identity?.company_users?.length) {
      const companyUser = identity.company_users[0];

      if (
        !companyUser.companies ||
        !companyUser.companies.active ||
        !companyUser.custom_roles
      ) {
        throw new UnauthorizedException(
          'Company user inactive or missing role',
        );
      }

      const permissions = (companyUser.custom_roles.role_permissions || [])
        .filter((rp) => !!rp.permissions)
        .map((rp) => `${rp.permissions.resource}:${rp.permissions.action}`);

      const employeeUser: RequestUser = {
        sub: payload.sub,
        identity_id: identity.id,
        company_user_id: companyUser.id,
        employee_id: companyUser.employee_id || '',
        email: identity.email,
        name:
          identity.persons?.full_name ||
          payload.preferred_username ||
          identity.email,
        tenant_slug: payload.tenant_slug || companyUser.companies.tenant_slug,
        company_id: companyUser.company_id,
        role_id: companyUser.custom_roles.id,
        role: companyUser.custom_roles.name,
        role_hierarchy: companyUser.custom_roles.hierarchy_level ?? 99,
        permissions,
        session_context: 'EMPLOYEE',
      };

      this.logger.debug(
        `OIDC EMPLOYEE Auth OK: ${employeeUser.email} | ${employeeUser.role}`,
        KeycloakJwtStrategy.name,
      );

      return employeeUser;
    }

    if (!identity) {
      throw new UnauthorizedException('Identity not found for token subject');
    }

    const customer = await this.prisma.customers.findFirst({
      where: {
        identity_id: identity.id,
        active: true,
        blocked: false,
      },
      include: {
        company_customers: {
          where: {
            is_active_in_loyalty: true,
            ...(payload.company_id ? { company_id: payload.company_id } : {}),
          },
          orderBy: {
            created_at: 'asc',
          },
          take: 1,
        },
      },
    });

    const companyCustomer = customer?.company_customers?.[0];

    if (!customer || !companyCustomer) {
      throw new UnauthorizedException('Identity not linked to active customer');
    }

    const company = await this.prisma.companies.findUnique({
      where: { id: companyCustomer.company_id },
    });

    if (!company || !company.active || company.suspended) {
      throw new UnauthorizedException('Company inactive for customer');
    }

    const customerUser: CustomerUser = {
      sub: payload.sub,
      identity_id: identity.id,
      customer_id: customer.id,
      company_id: company.id,
      email: customer.email || identity.email,
      name:
        customer.full_name ||
        identity.persons?.full_name ||
        payload.preferred_username ||
        identity.email,
      tenant_slug: payload.tenant_slug || company.tenant_slug,
      session_context: 'CUSTOMER',
      loyalty_level: companyCustomer.loyalty_level || 'BRONZE',
      accumulated_points: companyCustomer.accumulated_points || 0,
    };

    this.logger.debug(
      `OIDC CUSTOMER Auth OK: ${customerUser.email} | ${customerUser.company_id}`,
      KeycloakJwtStrategy.name,
    );

    return customerUser;
  }
}
