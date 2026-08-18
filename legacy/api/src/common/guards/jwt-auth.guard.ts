import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  CanActivate,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_ANONYMOUS_SESSION_KEY } from '../decorators/allow-anonymous-session.decorator';
import { TenantContextService } from '../services/tenant-context.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/common/redis/redis.service';
import type {
  RequestUser,
  CustomerUser,
} from 'src/modules/identity/auth/types/auth-user.types';
import type { Request } from 'express';
import { auth } from 'src/lib/auth';
import { fromNodeHeaders } from 'better-auth/node';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly tenantContext: TenantContextService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const allowAnonymousSession = this.reflector.getAllAndOverride<boolean>(
      ALLOW_ANONYMOUS_SESSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true; // Permite acesso sem autenticação
    }

    const req = context.switchToHttp().getRequest<Request>();

    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user?.email) {
      if (allowAnonymousSession) {
        return true;
      }
      throw new UnauthorizedException('Sessão inválida ou ausente');
    }

    const authenticatedUser = await this.resolveUserFromSession(
      session.user.email,
      req.headers['x-company-id'],
      req.headers['x-tenant-slug'],
      req.path,
    );

    if (!authenticatedUser) {
      if (allowAnonymousSession) {
        return true;
      }
      throw new UnauthorizedException(
        'Usuário sem vínculo ativo para acessar a API',
      );
    }

    (req as Request & { user?: RequestUser | CustomerUser }).user =
      authenticatedUser;
    this.tenantContext.setContext(authenticatedUser);
    return true;
  }

  private async resolveUserFromSession(
    email: string,
    requestedCompanyIdHeader: string | string[] | undefined,
    requestedTenantSlugHeader: string | string[] | undefined,
    requestPath: string,
  ): Promise<RequestUser | CustomerUser | null> {
    const requestedCompanyId = Array.isArray(requestedCompanyIdHeader)
      ? requestedCompanyIdHeader[0]
      : requestedCompanyIdHeader;
    const requestedTenantSlug = Array.isArray(requestedTenantSlugHeader)
      ? requestedTenantSlugHeader[0]
      : requestedTenantSlugHeader;
    const preferCustomerContext = requestPath.includes('/customer');

    const cacheKey = `auth:user:${email}:${requestedCompanyId || 'none'}:${requestedTenantSlug || 'none'}:${preferCustomerContext}`;
    const cachedData = await this.redis.get(cacheKey);
    if (cachedData) {
      try {
        return JSON.parse(cachedData) as RequestUser | CustomerUser;
      } catch (e) {
        // Ignorar erro de parse e seguir com consulta
      }
    }

    const identities = await this.prisma.identities.findMany({
      where: {
        email: email.trim().toLowerCase(),
        active: true,
      },
      include: {
        persons: true,
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    if (identities.length === 0) {
      return null;
    }

    if (preferCustomerContext) {
      for (const identity of identities) {
        const customerUser = await this.resolveCustomerForIdentity(
          identity,
          requestedCompanyId,
          requestedTenantSlug,
        );
        if (customerUser) {
          await this.redis.set(cacheKey, JSON.stringify(customerUser), 300);
          return customerUser;
        }
      }
    }

    for (const identity of identities) {
      if (identity.identity_type === 'SYSTEM') {
        const platformUser = await this.resolvePlatformAdminForIdentity(
          identity,
          requestedCompanyId,
          requestedTenantSlug,
        );
        if (platformUser) {
          await this.redis.set(cacheKey, JSON.stringify(platformUser), 60);
          return platformUser;
        }
      }

      const employeeUser = await this.resolveEmployeeForIdentity(
        identity,
        requestedCompanyId,
        requestedTenantSlug,
      );
      if (employeeUser) {
        await this.redis.set(cacheKey, JSON.stringify(employeeUser), 300);
        return employeeUser;
      }
    }

    for (const identity of identities) {
      const customerUser = await this.resolveCustomerForIdentity(
        identity,
        requestedCompanyId,
        requestedTenantSlug,
      );
      if (customerUser) {
        await this.redis.set(cacheKey, JSON.stringify(customerUser), 300);
        return customerUser;
      }
    }

    return null;
  }

  private async resolvePlatformAdminForIdentity(
    identity: {
      id: string;
      email: string;
      persons: { full_name: string } | null;
    },
    requestedCompanyId?: string,
    requestedTenantSlug?: string,
  ): Promise<RequestUser | null> {
    let companyId = '';
    let tenantSlug = '';

    if (requestedCompanyId || requestedTenantSlug) {
      const company = await this.prisma.companies.findFirst({
        where: {
          active: true,
          suspended: false,
          ...(requestedCompanyId ? { id: requestedCompanyId } : {}),
          ...(requestedTenantSlug ? { tenant_slug: requestedTenantSlug } : {}),
        },
      });
      if (company) {
        companyId = company.id;
        tenantSlug = company.tenant_slug;
      }
    }

    if (!companyId) {
      const firstCompany = await this.prisma.companies.findFirst({
        where: {
          active: true,
          suspended: false,
        },
        orderBy: {
          created_at: 'asc',
        },
      });
      if (firstCompany) {
        companyId = firstCompany.id;
        tenantSlug = firstCompany.tenant_slug;
      }
    }

    let customerId: string | undefined;
    if (tenantSlug && identity.email.includes('@')) {
      const [localPart, domain] = identity.email.split('@');
      const tenantAuthEmail = `${localPart}__tenant__${tenantSlug}@${domain}`;
      const customerIdentity = await this.prisma.identities.findFirst({
        where: {
          email: tenantAuthEmail,
          identity_type: 'CUSTOMER',
          active: true,
        },
      });
      if (customerIdentity) {
        const customer = await this.prisma.customers.findFirst({
          where: {
            identity_id: customerIdentity.id,
            active: true,
            blocked: false,
          },
        });
        if (customer) {
          customerId = customer.id;
        }
      }
    }

    return {
      sub: identity.id,
      identity_id: identity.id,
      company_user_id: '',
      employee_id: '',
      email: identity.email,
      name: identity.persons?.full_name || identity.email,
      tenant_slug: tenantSlug,
      company_id: companyId,
      role_id: '',
      role: 'Platform Admin',
      role_hierarchy: 0,
      permissions: [],
      session_context: 'PLATFORM',
      ...(customerId ? { customer_id: customerId } : {}),
    };
  }

  private async resolveEmployeeForIdentity(
    identity: {
      id: string;
      email: string;
      persons: { full_name: string } | null;
    },
    requestedCompanyId?: string,
    requestedTenantSlug?: string,
  ): Promise<RequestUser | null> {
    const employeeLinks = await this.prisma.company_users.findMany({
      where: {
        identity_id: identity.id,
        active: true,
        ...(requestedCompanyId ? { company_id: requestedCompanyId } : {}),
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
    });

    const employeeLink = employeeLinks.find(
      (companyUser) =>
        !!companyUser.companies &&
        companyUser.companies.active &&
        !companyUser.companies.suspended &&
        !!companyUser.custom_roles &&
        (!requestedTenantSlug ||
          companyUser.companies.tenant_slug === requestedTenantSlug),
    );

    if (
      !employeeLink ||
      !employeeLink.custom_roles ||
      !employeeLink.companies
    ) {
      return null;
    }

    const permissions = (employeeLink.custom_roles.role_permissions || [])
      .filter((rp) => !!rp.permissions)
      .map((rp) => `${rp.permissions.resource}:${rp.permissions.action}`);

    let customerId: string | undefined;
    const customerRecord = await this.prisma.customers.findFirst({
      where: {
        identity_id: identity.id,
        active: true,
        blocked: false,
      },
    });
    if (!customerRecord && identity.email.includes('@')) {
      const [localPart, domain] = identity.email.split('@');
      const baseEmail = localPart.split('__tenant__')[0];
      const tenantAuthEmail = `${baseEmail}__tenant__${employeeLink.companies.tenant_slug}@${domain}`;
      const customerIdentity = await this.prisma.identities.findFirst({
        where: {
          email: tenantAuthEmail,
          identity_type: 'CUSTOMER',
          active: true,
        },
      });
      if (customerIdentity) {
        const linkedCustomer = await this.prisma.customers.findFirst({
          where: {
            identity_id: customerIdentity.id,
            active: true,
            blocked: false,
          },
        });
        if (linkedCustomer) {
          customerId = linkedCustomer.id;
        }
      }
    } else if (customerRecord) {
      customerId = customerRecord.id;
    }

    return {
      sub: identity.id,
      identity_id: identity.id,
      company_user_id: employeeLink.id,
      employee_id: employeeLink.employee_id || '',
      email: identity.email,
      name: identity.persons?.full_name || identity.email,
      tenant_slug: employeeLink.companies.tenant_slug,
      company_id: employeeLink.company_id,
      role_id: employeeLink.custom_roles.id,
      role: employeeLink.custom_roles.name,
      role_hierarchy: employeeLink.custom_roles.hierarchy_level ?? 99,
      permissions,
      session_context: 'EMPLOYEE',
      ...(customerId ? { customer_id: customerId } : {}),
    };
  }

  private async resolveCustomerForIdentity(
    identity: {
      id: string;
      email: string;
      persons: { full_name: string } | null;
    },
    requestedCompanyId?: string,
    requestedTenantSlug?: string,
  ): Promise<CustomerUser | null> {
    const customers = await this.prisma.customers.findMany({
      where: {
        identity_id: identity.id,
        active: true,
        blocked: false,
      },
      include: {
        company_customers: {
          where: {
            is_active_in_loyalty: true,
            ...(requestedCompanyId ? { company_id: requestedCompanyId } : {}),
          },
          orderBy: {
            created_at: 'asc',
          },
        },
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    for (const customer of customers) {
      for (const companyCustomer of customer.company_customers || []) {
        const company = await this.prisma.companies.findUnique({
          where: { id: companyCustomer.company_id },
        });

        if (!company || !company.active || company.suspended) {
          continue;
        }

        if (
          requestedTenantSlug &&
          company.tenant_slug !== requestedTenantSlug
        ) {
          continue;
        }

        return {
          sub: identity.id,
          identity_id: identity.id,
          customer_id: customer.id,
          company_id: company.id,
          email: customer.email || identity.email,
          name:
            customer.full_name || identity.persons?.full_name || identity.email,
          tenant_slug: company.tenant_slug,
          session_context: 'CUSTOMER',
          loyalty_level: companyCustomer.loyalty_level || 'BRONZE',
          accumulated_points: companyCustomer.accumulated_points || 0,
        };
      }
    }

    return null;
  }

  // handleRequest removed as it is specific to AuthGuard('local-jwt')
}
