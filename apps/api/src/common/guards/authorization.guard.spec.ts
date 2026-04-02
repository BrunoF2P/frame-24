import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationGuard } from './authorization.guard';
import { LoggerService } from '../services/logger.service';

describe('AuthorizationGuard', () => {
  let guard: AuthorizationGuard;
  let reflector: jest.Mocked<Reflector>;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(() => {
    reflector = {
      get: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;

    guard = new AuthorizationGuard(reflector, logger);
  });

  const createContext = (user: unknown): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  const buildEmployee = (overrides: Record<string, unknown> = {}) => ({
    email: 'employee@company.com',
    role: 'MANAGER',
    role_hierarchy: 3,
    permissions: ['sales:read', 'sales:write'],
    session_context: 'EMPLOYEE',
    ...overrides,
  });

  it('should allow when no permission metadata is required', () => {
    reflector.get.mockReturnValue(undefined);
    const context = createContext(undefined);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow admin users by hierarchy bypass', () => {
    reflector.get.mockReturnValue('finance:read');
    const context = createContext(
      buildEmployee({ role_hierarchy: 1, permissions: [] }),
    );

    expect(guard.canActivate(context)).toBe(true);
    expect(logger.debug).toHaveBeenCalled();
  });

  it('should block if user is missing', () => {
    reflector.get.mockReturnValue('finance:read');
    const context = createContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow('Usuário não autenticado');
  });

  it('should block non-EMPLOYEE session context', () => {
    reflector.get.mockReturnValue('finance:read');
    const context = createContext(
      buildEmployee({
        session_context: 'CUSTOMER',
        email: 'customer@example.com',
      }),
    );

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow('Acesso negado');
    expect(logger.warn).toHaveBeenCalled();
  });

  it('should block when user lacks required permission', () => {
    reflector.get.mockReturnValue('finance:delete');
    const context = createContext(
      buildEmployee({ permissions: ['finance:read'] }),
    );

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow('Acesso negado');
    expect(logger.warn).toHaveBeenCalled();
  });

  it('should guard against invalid role_hierarchy and deny admin bypass', () => {
    reflector.get.mockReturnValue('finance:delete');
    const context = createContext(
      buildEmployee({ role_hierarchy: null, permissions: ['finance:read'] }),
    );

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(logger.error).toHaveBeenCalled();
  });

  it('should allow non-admin with explicit required permission', () => {
    reflector.get.mockReturnValue('finance:read');
    const context = createContext(
      buildEmployee({ role_hierarchy: 4, permissions: ['finance:read'] }),
    );

    expect(guard.canActivate(context)).toBe(true);
  });
});
