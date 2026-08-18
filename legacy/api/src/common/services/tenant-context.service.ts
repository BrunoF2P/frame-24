import { ForbiddenException, Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class TenantContextService {
  constructor(private readonly cls: ClsService) {}

  getCompanyId(): string {
    const companyId = this.cls.get<string>('companyId');
    if (!companyId) {
      throw new ForbiddenException('Contexto da empresa não encontrado.');
    }
    return companyId;
  }

  getUserId(): string | undefined {
    return this.cls.get<string>('userId');
  }

  getRequiredUserId(): string {
    const userId = this.cls.get<string>('userId');
    if (!userId) {
      throw new ForbiddenException('Contexto do usuário não encontrado.');
    }
    return userId;
  }

  getCustomerId(): string | undefined {
    return this.cls.get<string>('customerId');
  }

  getSessionContext(): 'EMPLOYEE' | 'CUSTOMER' | 'PLATFORM' | undefined {
    return this.cls.get<'EMPLOYEE' | 'CUSTOMER' | 'PLATFORM'>('sessionContext');
  }

  getIdentityId(): string | undefined {
    return this.cls.get<string>('identityId');
  }

  getRoleHierarchy(): number | undefined {
    return this.cls.get<number>('roleHierarchy');
  }

  setContext(user: unknown): void {
    if (!user || typeof user !== 'object') {
      return;
    }

    const fieldMap: Array<{
      field: string;
      clsKey: string;
      typeCheck?: string;
    }> = [
      { field: 'company_id', clsKey: 'companyId' },
      { field: 'company_user_id', clsKey: 'userId' },
      { field: 'identity_id', clsKey: 'identityId' },
      { field: 'role_hierarchy', clsKey: 'roleHierarchy', typeCheck: 'number' },
      { field: 'session_context', clsKey: 'sessionContext' },
      { field: 'customer_id', clsKey: 'customerId' },
      { field: 'tenant_slug', clsKey: 'tenantSlug' },
    ];

    const record = user as Record<string, unknown>;

    for (const { field, clsKey, typeCheck } of fieldMap) {
      if (!(field in record)) continue;
      const value = record[field];
      if (value == null) continue;
      if (typeCheck && typeof value !== typeCheck) continue;
      this.cls.set(clsKey, value);
    }

    // userId fallback: use customer_id when company_user_id is not present
    if (
      !('company_user_id' in record) &&
      'customer_id' in record &&
      record.customer_id
    ) {
      this.cls.set('userId', record.customer_id);
    }

    // userId fallback for PLATFORM sessions: company_user_id is empty string
    const currentUserId = this.cls.get<string>('userId');
    if (!currentUserId && 'identity_id' in record && record.identity_id) {
      this.cls.set('userId', record.identity_id as string);
    }
  }
}
