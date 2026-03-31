import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoggerService } from 'src/common/services/logger.service';
import { requireEnv } from 'src/config/env.util';
import { ClsService } from 'nestjs-cls';

export interface JwtPayload {
  sub: string;
  identity_id: string;
  company_id?: string;
  email: string;
  session_context?: 'EMPLOYEE' | 'CUSTOMER';
  iat: number;
  exp: number;
}

export interface RequestUser {
  sub: string;
  identity_id: string;
  company_user_id: string;
  employee_id: string;
  email: string;
  name: string;
  tenant_slug: string;
  company_id: string;
  role_id: string;
  role: string;
  role_hierarchy: number;
  permissions: string[];
  session_context: 'EMPLOYEE';
}

export interface CustomerUser {
  sub: string;
  identity_id: string;
  customer_id: string;
  company_id: string;
  email: string;
  name: string;
  tenant_slug: string;
  session_context: 'CUSTOMER';
  loyalty_level?: string;
  accumulated_points?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly cls: ClsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: requireEnv('JWT_SECRET', 'test-jwt-secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser | CustomerUser> {
    this.logger.debug(
      `Validando JWT: ${payload.identity_id} | context: ${payload.session_context || 'EMPLOYEE'}`,
      JwtStrategy.name,
    );

    await this.assertValidSession(payload);
    const identity = await this.loadIdentity(payload);
    this.assertIdentityActive(identity);

    // Se for CUSTOMER, validar customer
    if (payload.session_context === 'CUSTOMER') {
      const customerUser = await this.buildCustomerUser(
        payload,
        identity.email,
      );

      this.logger.debug(
        `Customer Auth OK: ${customerUser.email}`,
        JwtStrategy.name,
      );
      this.setContext(customerUser.company_id, customerUser.customer_id);

      return customerUser;
    }

    // Validação para EMPLOYEE (lógica original)
    const user = this.buildEmployeeUser(payload, identity);

    this.logger.debug(
      `Employee Auth OK: ${user.email} | ${user.role}`,
      JwtStrategy.name,
    );
    this.setContext(user.company_id, user.company_user_id);

    return user;
  }

  private async assertValidSession(payload: JwtPayload): Promise<void> {
    const session = await this.prisma.user_sessions.findFirst({
      where: {
        identity_id: payload.identity_id,
        company_id: payload.company_id || undefined,
        session_context: payload.session_context || 'EMPLOYEE',
        active: true,
        revoked: false,
        expires_at: {
          gt: new Date(),
        },
      },
    });

    if (!session) {
      this.logger.warn(
        `SECURITY: Token revogado ou expirado para ${payload.identity_id}`,
        JwtStrategy.name,
      );
      throw new UnauthorizedException(
        'Sessão inválida, revogada ou expirada. Faça login novamente.',
      );
    }
  }

  private async loadIdentity(payload: JwtPayload) {
    return this.prisma.identities.findUnique({
      where: { id: payload.identity_id },
      include: {
        company_users: {
          where: payload.company_id
            ? {
                company_id: payload.company_id,
                active: true,
              }
            : { active: true },
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
        },
        persons: true,
      },
    });
  }

  private assertIdentityActive(
    identity: Awaited<ReturnType<JwtStrategy['loadIdentity']>>,
  ): asserts identity is NonNullable<
    Awaited<ReturnType<JwtStrategy['loadIdentity']>>
  > {
    if (!identity || !identity.active) {
      throw new UnauthorizedException('Token inválido ou usuário inativo');
    }
  }

  private async buildCustomerUser(
    payload: JwtPayload,
    identityEmail: string,
  ): Promise<CustomerUser> {
    if (!payload.company_id) {
      throw new UnauthorizedException('Company ID obrigatório para clientes');
    }

    const customer = await this.prisma.customers.findUnique({
      where: { identity_id: payload.identity_id },
      include: {
        company_customers: {
          where: { company_id: payload.company_id },
        },
      },
    });

    if (!customer || !customer.active || customer.blocked) {
      throw new UnauthorizedException('Cliente não encontrado ou inativo');
    }

    const companyCustomer = customer.company_customers[0];
    if (!companyCustomer || !companyCustomer.is_active_in_loyalty) {
      throw new UnauthorizedException('Cliente não vinculado à empresa');
    }

    const company = await this.prisma.companies.findUnique({
      where: { id: payload.company_id },
    });

    if (!company || !company.active) {
      throw new UnauthorizedException('Empresa inativa ou suspensa');
    }

    return {
      sub: payload.sub,
      identity_id: payload.identity_id,
      customer_id: customer.id,
      company_id: payload.company_id,
      email: customer.email || identityEmail,
      name: customer.full_name,
      tenant_slug: company.tenant_slug,
      session_context: 'CUSTOMER',
      loyalty_level: companyCustomer.loyalty_level || 'BRONZE',
      accumulated_points: companyCustomer.accumulated_points || 0,
    };
  }

  private buildEmployeeUser(
    payload: JwtPayload,
    identity: NonNullable<Awaited<ReturnType<JwtStrategy['loadIdentity']>>>,
  ): RequestUser {
    if (!identity.company_users || identity.company_users.length === 0) {
      throw new UnauthorizedException('Usuário não vinculado a empresa ativa');
    }

    const companyUser = identity.company_users[0];

    if (!companyUser.companies || !companyUser.companies.active) {
      throw new UnauthorizedException('Empresa inativa ou suspensa');
    }

    if (!companyUser.custom_roles) {
      throw new UnauthorizedException('Usuário sem perfil de acesso definido');
    }

    const permissions = (companyUser.custom_roles.role_permissions || [])
      .filter((rp) => !!rp.permissions)
      .map((rp) => `${rp.permissions.resource}:${rp.permissions.action}`);

    return {
      sub: payload.sub,
      identity_id: payload.identity_id,
      company_user_id: companyUser.id,
      employee_id: companyUser.employee_id || '',
      email: payload.email,
      name: identity.persons?.full_name || payload.email,
      tenant_slug: companyUser.companies.tenant_slug,
      company_id: companyUser.company_id,
      role_id: companyUser.custom_roles.id,
      role: companyUser.custom_roles.name,
      role_hierarchy: companyUser.custom_roles.hierarchy_level ?? 99,
      permissions,
      session_context: 'EMPLOYEE',
    };
  }

  private setContext(companyId: string, userId: string) {
    this.cls.set('companyId', companyId);
    this.cls.set('userId', userId);
  }
}
