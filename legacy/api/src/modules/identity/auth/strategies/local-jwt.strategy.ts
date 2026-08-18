import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoggerService } from 'src/common/services/logger.service';
import type { RequestUser, CustomerUser } from '../types/auth-user.types';

interface LocalJwtPayload {
  sub: string;
  identity_id?: string;
  customer_id?: string;
  company_id?: string;
  tenant_slug?: string;
  email?: string;
  name?: string;
  role_id?: string;
  role?: string;
  role_hierarchy?: number;
  permissions?: string[];
  employee_id?: string;
  session_context?: 'EMPLOYEE' | 'CUSTOMER';
  loyalty_level?: string;
  accumulated_points?: number;
  aud?: string | string[];
  iss?: string;
}

@Injectable()
export class LocalJwtStrategy extends PassportStrategy(Strategy, 'local-jwt') {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'test-jwt-secret',
      algorithms: ['HS256'],
    });
  }

  async validate(
    payload: LocalJwtPayload,
  ): Promise<RequestUser | CustomerUser> {
    const identityId = payload.identity_id ?? payload.sub;

    if (!identityId) {
      throw new UnauthorizedException('Token inválido: identity ausente');
    }

    const identity = await this.prisma.identities.findUnique({
      where: { id: identityId },
      include: {
        persons: true,
      },
    });

    if (!identity || !identity.active) {
      throw new UnauthorizedException('Identity not found or inactive');
    }

    if (payload.session_context === 'EMPLOYEE') {
      if (!payload.company_id) {
        throw new UnauthorizedException('Token inválido para funcionário');
      }

      const companyUser = await this.prisma.company_users.findFirst({
        where: {
          company_id: payload.company_id,
          identity_id: identity.id,
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
      });

      if (
        !companyUser ||
        !companyUser.companies ||
        !companyUser.companies.active ||
        companyUser.companies.suspended ||
        !companyUser.custom_roles
      ) {
        throw new UnauthorizedException(
          'Company user inactive ou sem papel configurado',
        );
      }

      const permissions = (companyUser.custom_roles.role_permissions || [])
        .filter((rp) => !!rp.permissions)
        .map((rp) => `${rp.permissions.resource}:${rp.permissions.action}`);

      const user: RequestUser = {
        sub: identity.id,
        identity_id: identity.id,
        company_user_id: companyUser.id,
        employee_id: companyUser.employee_id || '',
        email: identity.email,
        name: identity.persons?.full_name || identity.email,
        tenant_slug: companyUser.companies.tenant_slug,
        company_id: companyUser.company_id,
        role_id: companyUser.custom_roles.id,
        role: companyUser.custom_roles.name,
        role_hierarchy: companyUser.custom_roles.hierarchy_level ?? 99,
        permissions,
        session_context: 'EMPLOYEE',
      };

      this.logger.debug(
        `LOCAL EMPLOYEE Auth OK: ${user.email} | ${user.role}`,
        LocalJwtStrategy.name,
      );

      return user;
    }

    if (!payload.company_id) {
      throw new UnauthorizedException('Token inválido para cliente');
    }

    const customer =
      payload.customer_id &&
      (await this.prisma.customers.findFirst({
        where: {
          id: payload.customer_id,
          identity_id: identity.id,
          active: true,
          blocked: false,
        },
      }));

    const resolvedCustomer =
      customer ??
      (await this.prisma.customers.findFirst({
        where: {
          identity_id: identity.id,
          active: true,
          blocked: false,
        },
      }));

    if (!resolvedCustomer) {
      throw new UnauthorizedException('Identity not linked to active customer');
    }

    const companyCustomer = await this.prisma.company_customers.findFirst({
      where: {
        company_id: payload.company_id,
        customer_id: resolvedCustomer.id,
        is_active_in_loyalty: true,
      },
    });

    if (!companyCustomer) {
      throw new UnauthorizedException('Cliente sem vínculo ativo na empresa');
    }

    const company = await this.prisma.companies.findUnique({
      where: { id: payload.company_id },
    });

    if (!company || !company.active || company.suspended) {
      throw new UnauthorizedException('Company inactive for customer');
    }

    const user: CustomerUser = {
      sub: identity.id,
      identity_id: identity.id,
      customer_id: resolvedCustomer.id,
      company_id: company.id,
      email: resolvedCustomer.email || identity.email,
      name:
        resolvedCustomer.full_name ||
        identity.persons?.full_name ||
        identity.email,
      tenant_slug: payload.tenant_slug || company.tenant_slug,
      session_context: 'CUSTOMER',
      loyalty_level: companyCustomer.loyalty_level || 'BRONZE',
      accumulated_points: companyCustomer.accumulated_points || 0,
    };

    this.logger.debug(
      `LOCAL CUSTOMER Auth OK: ${user.email} | ${user.company_id}`,
      LocalJwtStrategy.name,
    );

    return user;
  }
}
