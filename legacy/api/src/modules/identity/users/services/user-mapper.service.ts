import { Injectable, BadRequestException } from '@nestjs/common';
import { UserResponseDto } from '../dto/user-response.dto';
import { CompanyUserWithRelations } from 'src/modules/identity/auth/repositories/company-user.repository';

@Injectable()
export class UserMapperService {
  toResponseDto(companyUser: CompanyUserWithRelations): UserResponseDto {
    if (!companyUser.identities.persons) {
      throw new BadRequestException('Person data is missing');
    }

    const person = companyUser.identities.persons;

    return {
      employee_id: companyUser.employee_id,
      full_name: person.full_name,
      email: companyUser.identities.email,
      cpf: person.cpf,
      mobile: person.mobile,
      company_user: {
        id: companyUser.id,
        employee_id: companyUser.employee_id,
        role_id: companyUser.role_id,
        role_name: companyUser.custom_roles.name,
        department: companyUser.department,
        job_level: companyUser.job_level,
        active: companyUser.active ?? false,
        start_date: companyUser.start_date?.toISOString() ?? '',
        end_date: companyUser.end_date?.toISOString() ?? null,
        last_access: companyUser.last_access?.toISOString() ?? null,
      },
      created_at: companyUser.created_at?.toISOString() ?? '',
      updated_at: companyUser.updated_at?.toISOString() ?? '',
    };
  }
}
