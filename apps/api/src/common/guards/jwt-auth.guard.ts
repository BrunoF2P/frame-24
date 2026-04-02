import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { TenantContextService } from '../services/tenant-context.service';
import type {
  RequestUser,
  CustomerUser,
} from 'src/modules/identity/auth/types/auth-user.types';

@Injectable()
export class JwtAuthGuard extends AuthGuard('keycloak-jwt') {
  constructor(
    private reflector: Reflector,
    private readonly tenantContext: TenantContextService,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true; // Permite acesso sem autenticação
    }

    return super.canActivate(context);
  }

  handleRequest<TUser extends RequestUser | CustomerUser>(
    err: unknown,
    user: TUser,
    info: unknown,
    context: ExecutionContext,
  ): TUser {
    const authenticatedUser = super.handleRequest<TUser>(
      err,
      user,
      info,
      context,
    );

    if (authenticatedUser) {
      this.tenantContext.setContext(authenticatedUser);
    }

    return authenticatedUser;
  }
}
