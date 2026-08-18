import { company_users } from '@repo/db';
import {
  CompanyUser,
  CompanyUserProps,
} from '../../domain/entities/company-user.entity';

export class CompanyUserMapper {
  static toDomain(raw: company_users): CompanyUser {
    const props: CompanyUserProps = {
      id: raw.id,
      identityId: raw.identity_id,
      companyId: raw.company_id,
      roleId: raw.role_id,
      employeeId: raw.employee_id,
      active: raw.active ?? true,
      startDate: raw.start_date ?? new Date(),
      endDate: raw.end_date,
      lastAccess: raw.last_access,
      accessCount: raw.access_count ?? 0,
    };

    return CompanyUser.create(props);
  }
}
