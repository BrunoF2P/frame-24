import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LoggerService } from '../services/logger.service';
import {
  RequestUser,
  CustomerUser,
} from 'src/modules/identity/auth/types/auth-user.types';

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private logger: LoggerService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.get<string>(
      'permission',
      context.getHandler(),
    );

    if (!requiredPermission) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user: RequestUser | CustomerUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    // Session context validation: only EMPLOYEE can access permission-protected endpoints
    if (user.session_context !== 'EMPLOYEE') {
      this.logger.warn(
        `Acesso negado: ${user.email} (context: ${user.session_context}) tentou acessar endpoint restrito a funcionários`,
        AuthorizationGuard.name,
      );
      throw new ForbiddenException('Acesso negado');
    }

    const employeeUser = user;

    if (this.isAdmin(employeeUser)) {
      this.logger.debug(
        `Admin bypass: ${employeeUser.email} (hierarchy: ${employeeUser.role_hierarchy}) | ${requiredPermission}`,
        AuthorizationGuard.name,
      );
      return true;
    }

    const hasPermission = employeeUser.permissions.includes(requiredPermission);

    if (!hasPermission) {
      this.logger.warn(
        `Acesso negado: ${employeeUser.email} (role: ${employeeUser.role}, hierarchy: ${employeeUser.role_hierarchy}) tentou ${requiredPermission}`,
        AuthorizationGuard.name,
      );
      throw new ForbiddenException('Acesso negado');
    }

    return true;
  }

  private isAdmin(user: RequestUser): boolean {
    if (
      user.role_hierarchy === null ||
      user.role_hierarchy === undefined ||
      typeof user.role_hierarchy !== 'number'
    ) {
      this.logger.error(
        `SECURITY ALERT: User ${user.email} tem hierarchy inválido: ${String(user.role_hierarchy)}`,
        AuthorizationGuard.name,
      );
      return false;
    }
    return user.role_hierarchy <= 1;
  }
}
