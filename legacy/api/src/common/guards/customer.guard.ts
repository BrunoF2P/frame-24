import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { AuthenticatedUser } from 'src/modules/identity/auth/types/auth-user.types';

@Injectable()
export class CustomerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ user: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Cliente não autenticado');
    }

    const allowedContexts = ['CUSTOMER', 'EMPLOYEE', 'PLATFORM'] as const;
    if (!allowedContexts.includes(user.session_context)) {
      throw new ForbiddenException('Acesso permitido apenas para clientes');
    }

    return true;
  }
}
