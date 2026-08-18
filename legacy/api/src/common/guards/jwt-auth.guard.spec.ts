import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { auth } from 'src/lib/auth';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_ANONYMOUS_SESSION_KEY } from '../decorators/allow-anonymous-session.decorator';
import { TenantContextService } from '../services/tenant-context.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/common/redis/redis.service';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Reflector>;
  let tenantContext: jest.Mocked<TenantContextService>;
  let prisma: jest.Mocked<PrismaService>;
  let redis: jest.Mocked<RedisService>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    tenantContext = {
      setContext: jest.fn(),
    } as unknown as jest.Mocked<TenantContextService>;

    prisma = {} as jest.Mocked<PrismaService>;
    redis = {
      get: jest.fn(),
      set: jest.fn(),
    } as unknown as jest.Mocked<RedisService>;

    guard = new JwtAuthGuard(reflector, tenantContext, prisma, redis);

    jest.spyOn(auth.api, 'getSession').mockResolvedValue(null);
  });

  const createContext = (headers: Record<string, string> = {}) => {
    const request = {
      headers,
      path: '/api/protected',
    } as any;

    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
    } as unknown as ExecutionContext;

    return { context, request };
  };

  const mockMetadata = ({
    isPublic = false,
    allowAnonymousSession = false,
  } = {}) => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return isPublic;
      if (key === ALLOW_ANONYMOUS_SESSION_KEY) return allowAnonymousSession;
      return undefined;
    });
  };

  it('should allow public routes without loading a session', async () => {
    const { context } = createContext();
    mockMetadata({ isPublic: true });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    expect(auth.api.getSession).not.toHaveBeenCalled();
  });

  it('should reject protected routes without a valid session', async () => {
    const { context } = createContext();
    mockMetadata();

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(tenantContext.setContext).not.toHaveBeenCalled();
  });

  it('should allow anonymous session routes without a valid session', async () => {
    const { context } = createContext();
    mockMetadata({ allowAnonymousSession: true });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(tenantContext.setContext).not.toHaveBeenCalled();
  });

  it('should attach cached authenticated user and set tenant context', async () => {
    const { context, request } = createContext({
      'x-company-id': 'company-1',
    });
    const user = {
      identity_id: 'identity-1',
      company_id: 'company-1',
      company_user_id: 'user-1',
      session_context: 'EMPLOYEE',
    };

    mockMetadata();
    jest.spyOn(auth.api, 'getSession').mockResolvedValue({
      user: { email: 'user@example.com' },
    });
    redis.get.mockResolvedValue(JSON.stringify(user));

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual(user);
    expect(tenantContext.setContext).toHaveBeenCalledWith(user);
    expect(redis.get).toHaveBeenCalledWith(
      'auth:user:user@example.com:company-1:none:false',
    );
  });
});
