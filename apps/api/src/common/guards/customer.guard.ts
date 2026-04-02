import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { CustomerUser } from 'src/modules/identity/auth/types/auth-user.types';

@Injectable()
export class CustomerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user: CustomerUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Cliente não autenticado');
    }

    if (user.session_context !== 'CUSTOMER') {
      throw new ForbiddenException('Acesso permitido apenas para clientes');
    }

    return true;
  }
}
