import { ForbiddenException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { TenantContextService } from './tenant-context.service';

describe('TenantContextService', () => {
  let service: TenantContextService;
  let cls: jest.Mocked<ClsService>;

  beforeEach(() => {
    cls = {
      get: jest.fn(),
      set: jest.fn(),
    } as unknown as jest.Mocked<ClsService>;

    service = new TenantContextService(cls);
  });

  it('should return company id from CLS', () => {
    cls.get.mockReturnValue('company-1');

    expect(service.getCompanyId()).toBe('company-1');
    expect(cls.get).toHaveBeenCalledWith('companyId');
  });

  it('should throw when company id is missing', () => {
    cls.get.mockReturnValue(undefined);

    expect(() => service.getCompanyId()).toThrow(ForbiddenException);
    expect(() => service.getCompanyId()).toThrow(
      'Contexto da empresa não encontrado.',
    );
  });

  it('should return undefined user id when not present', () => {
    cls.get.mockReturnValue(undefined);

    expect(service.getUserId()).toBeUndefined();
    expect(cls.get).toHaveBeenCalledWith('userId');
  });

  it('should throw when required user id is missing', () => {
    cls.get.mockReturnValue(undefined);

    expect(() => service.getRequiredUserId()).toThrow(ForbiddenException);
    expect(() => service.getRequiredUserId()).toThrow(
      'Contexto do usuário não encontrado.',
    );
  });

  it('should return session context from CLS', () => {
    cls.get.mockReturnValue('CUSTOMER');

    expect(service.getSessionContext()).toBe('CUSTOMER');
    expect(cls.get).toHaveBeenCalledWith('sessionContext');
  });

  it('should map known user fields to CLS keys', () => {
    const user = {
      company_id: 'company-1',
      company_user_id: 'user-1',
      identity_id: 'identity-1',
      role_hierarchy: 2,
      session_context: 'EMPLOYEE',
      customer_id: 'customer-1',
      tenant_slug: 'tenant-a',
    };

    service.setContext(user);

    expect(cls.set).toHaveBeenCalledWith('companyId', 'company-1');
    expect(cls.set).toHaveBeenCalledWith('userId', 'user-1');
    expect(cls.set).toHaveBeenCalledWith('identityId', 'identity-1');
    expect(cls.set).toHaveBeenCalledWith('roleHierarchy', 2);
    expect(cls.set).toHaveBeenCalledWith('sessionContext', 'EMPLOYEE');
    expect(cls.set).toHaveBeenCalledWith('customerId', 'customer-1');
    expect(cls.set).toHaveBeenCalledWith('tenantSlug', 'tenant-a');
  });

  it('should ignore invalid typed fields like non-number role_hierarchy', () => {
    service.setContext({
      role_hierarchy: '1',
      company_id: 'company-2',
    });

    expect(cls.set).toHaveBeenCalledWith('companyId', 'company-2');
    expect(cls.set).not.toHaveBeenCalledWith('roleHierarchy', '1');
  });

  it('should fallback userId to customer_id when company_user_id is absent', () => {
    service.setContext({
      customer_id: 'customer-9',
      session_context: 'CUSTOMER',
    });

    expect(cls.set).toHaveBeenCalledWith('customerId', 'customer-9');
    expect(cls.set).toHaveBeenCalledWith('userId', 'customer-9');
  });

  it('should fallback userId to identity_id when company_user_id is empty (PLATFORM session)', () => {
    cls.get.mockReturnValue(undefined);

    service.setContext({
      company_id: 'company-1',
      company_user_id: '',
      identity_id: 'identity-platform',
      session_context: 'PLATFORM',
    });

    expect(cls.set).toHaveBeenCalledWith('userId', '');
    expect(cls.set).toHaveBeenCalledWith('identityId', 'identity-platform');
    expect(cls.set).toHaveBeenCalledWith('userId', 'identity-platform');
  });

  it('should do nothing when context payload is not an object', () => {
    service.setContext(null);
    service.setContext('invalid');
    service.setContext(123);

    expect(cls.set).not.toHaveBeenCalled();
  });
});
