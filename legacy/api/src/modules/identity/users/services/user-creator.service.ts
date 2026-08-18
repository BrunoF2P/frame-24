import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from '../dto/create-user.dto';

import { LoggerService } from 'src/common/services/logger.service';
import { PersonRepository } from 'src/modules/identity/auth/repositories/person.repository';
import { IdentityRepository } from 'src/modules/identity/auth/repositories/identity.repository';
import { CompanyUserRepository } from 'src/modules/identity/auth/repositories/company-user.repository';
import { EmployeeIdGeneratorService } from 'src/modules/identity/auth/services/employee-id-generator';
import { Cpf } from 'src/modules/identity/users/domain/value-objects/cpf.value.object';
import { Password } from 'src/modules/identity/auth/domain/value-objects/password.value-object';

@Injectable()
export class UserCreatorService {
  constructor(
    private readonly personRepository: PersonRepository,
    private readonly identityRepository: IdentityRepository,
    private readonly companyUserRepository: CompanyUserRepository,
    private readonly employeeIdGenerator: EmployeeIdGeneratorService,
    private readonly logger: LoggerService,
  ) {}

  async create(dto: CreateUserDto, companyId: string) {
    const person = await this.createOrFindPerson(dto);
    if (!person) {
      throw new NotFoundException('Erro ao criar/encontrar pessoa.');
    }
    const identity = await this.createIdentity(dto, person.id);
    const employeeId = await this.employeeIdGenerator.generate(companyId);

    return this.createCompanyUser(identity.id, companyId, dto, employeeId);
  }

  private async createOrFindPerson(dto: CreateUserDto) {
    if (dto.cpf) {
      const cpf = Cpf.create(dto.cpf);
      const existing = await this.personRepository.findByCpf(cpf.value);

      if (existing) {
        this.logger.log(
          `Reutilizando a pessoa: ${existing.id}`,
          UserCreatorService.name,
        );
        return this.updateExistingPerson(existing.id, dto);
      }
    }

    return this.personRepository.createPerson({
      fullName: dto.full_name,
      cpf: dto.cpf,
      birthDate: dto.birth_date,
      phone: dto.phone,
      mobile: dto.mobile,
      email: dto.email,
      zipCode: dto.zip_code,
      streetAddress: dto.street_address,
      addressNumber: dto.address_number,
      addressComplement: dto.address_complement,
      neighborhood: dto.neighborhood,
      city: dto.city,
      state: dto.state,
      country: dto.country,
    });
  }

  private async updateExistingPerson(personId: string, dto: CreateUserDto) {
    if (dto.full_name || dto.mobile || dto.email) {
      return this.personRepository.updatePersonData(personId, {
        fullName: dto.full_name,
        mobile: dto.mobile,
        email: dto.email,
      });
    }
    return this.personRepository.findById(personId);
  }

  private async createIdentity(dto: CreateUserDto, personId: string) {
    const password = await Password.create(dto.password);

    return this.identityRepository.createEmployee({
      personId,
      email: dto.email,
      passwordHash: password.hash,
      active: dto.active ?? true,
    });
  }

  private async createCompanyUser(
    identityId: string,
    companyId: string,
    dto: CreateUserDto,
    employeeId: string,
  ) {
    return this.companyUserRepository.createUser({
      identityId,
      companyId,
      roleId: dto.role_id,
      employeeId,
      department: dto.department,
      jobLevel: dto.job_level,
      location: dto.location,
      allowedComplexes: dto.allowed_complexes,
      ipWhitelist: dto.ip_whitelist,
      active: dto.active ?? true,
      startDate: dto.start_date,
      endDate: dto.end_date,
    });
  }
}
