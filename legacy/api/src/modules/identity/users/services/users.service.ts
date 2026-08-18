import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { Transactional } from '@nestjs-cls/transactional';
import { LoggerService } from 'src/common/services/logger.service';

import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';

import { IdentityRepository } from 'src/modules/identity/auth/repositories/identity.repository';
import { PersonRepository } from 'src/modules/identity/auth/repositories/person.repository';
import {
  CompanyUserRepository,
  CompanyUserWithRelations,
} from 'src/modules/identity/auth/repositories/company-user.repository';
import { CustomRoleRepository } from 'src/modules/identity/auth/repositories/custom-role.repository';

import { UserCreatorService } from './user-creator.service';
import { UserMapperService } from './user-mapper.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly identityRepository: IdentityRepository,
    private readonly personRepository: PersonRepository,
    private readonly companyUserRepository: CompanyUserRepository,
    private readonly customRoleRepository: CustomRoleRepository,
    private readonly userCreator: UserCreatorService,
    private readonly userMapper: UserMapperService,
    private readonly logger: LoggerService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Transactional()
  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const companyId = this.tenantContext.getCompanyId();
    this.logger.log(
      `Criando usuário: ${dto.email} @ ${companyId}`,
      UsersService.name,
    );

    await this.validateRole(dto.role_id, companyId);
    await this.validateEmailUniqueness(dto.email, companyId);

    const companyUser = await this.userCreator.create(dto, companyId);

    this.logger.log(`Usuário criado: ${dto.email}`, UsersService.name);

    const companyUserWithRelations =
      await this.companyUserRepository.findByIdWithRelations(companyUser.id);

    if (!companyUserWithRelations) {
      throw new NotFoundException('Erro ao buscar usuário criado.');
    }

    return this.userMapper.toResponseDto(companyUserWithRelations);
  }

  async findAll(): Promise<UserResponseDto[]> {
    const companyId = this.tenantContext.getCompanyId();
    const companyUsers =
      await this.companyUserRepository.findAllByCompanyWithRelations(companyId);
    return companyUsers.map((cu) => this.userMapper.toResponseDto(cu));
  }

  async findOne(employeeId: string): Promise<UserResponseDto> {
    const companyId = this.tenantContext.getCompanyId();
    const companyUser = await this.findCompanyUserWithRelationsOrFail(
      employeeId,
      companyId,
    );
    return this.userMapper.toResponseDto(companyUser);
  }

  @Transactional()
  async update(
    employeeId: string,
    dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const companyId = this.tenantContext.getCompanyId();
    const companyUser = await this.findCompanyUserWithRelationsOrFail(
      employeeId,
      companyId,
    );

    if (dto.role_id && dto.role_id !== companyUser.role_id) {
      await this.validateRole(dto.role_id, companyId);
    }

    await this.updatePersonData(companyUser, dto);
    await this.updateIdentityData(companyUser, dto);

    const updatedCompanyUser = await this.updateCompanyUserData(
      companyUser.id,
      dto,
    );

    this.logger.log(`Usuário atualizado: ${employeeId}`, UsersService.name);

    return this.userMapper.toResponseDto(updatedCompanyUser);
  }

  async softDelete(employeeId: string): Promise<void> {
    const companyId = this.tenantContext.getCompanyId();
    const companyUser = await this.findCompanyUserWithRelationsOrFail(
      employeeId,
      companyId,
    );
    await this.companyUserRepository.softDelete(companyUser.id);
    this.logger.log(
      `Usuário excluído (soft delete): ${employeeId}`,
      UsersService.name,
    );
  }

  private async validateRole(roleId: string, companyId: string): Promise<void> {
    const role = await this.customRoleRepository.findByIdAndCompany(
      roleId,
      companyId,
    );
    if (!role) {
      throw new BadRequestException(
        'Role inválida ou não pertence a esta empresa.',
      );
    }
  }

  private async validateEmailUniqueness(
    email: string,
    companyId: string,
  ): Promise<void> {
    const existing = await this.identityRepository.findByEmailAndCompany(
      email,
      companyId,
      'EMPLOYEE',
    );

    if (existing) {
      throw new ConflictException(
        'Já existe um usuário com este email nesta empresa.',
      );
    }
  }

  private async findCompanyUserWithRelationsOrFail(
    employeeId: string,
    companyId: string,
  ): Promise<CompanyUserWithRelations> {
    const companyUser =
      await this.companyUserRepository.findByEmployeeIdAndCompanyWithRelations(
        employeeId,
        companyId,
      );

    if (!companyUser) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return companyUser;
  }

  private async updatePersonData(
    companyUser: CompanyUserWithRelations,
    dto: UpdateUserDto,
  ): Promise<void> {
    const personId = companyUser.identities.person_id;
    if (!personId) {
      throw new NotFoundException('Person ID não encontrado.');
    }

    const hasPersonUpdate =
      dto.full_name ||
      dto.cpf ||
      dto.birth_date ||
      dto.phone ||
      dto.mobile ||
      dto.email ||
      dto.zip_code;

    if (hasPersonUpdate) {
      await this.personRepository.updatePersonData(personId, {
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
  }

  private async updateIdentityData(
    companyUser: CompanyUserWithRelations,
    dto: UpdateUserDto,
  ): Promise<void> {
    if (dto.email && dto.email !== companyUser.identities.email) {
      await this.identityRepository.updateEmail(
        companyUser.identity_id,
        dto.email,
      );
    }
  }

  private async updateCompanyUserData(
    companyUserId: string,
    dto: UpdateUserDto,
  ): Promise<CompanyUserWithRelations> {
    await this.companyUserRepository.updateUserData(companyUserId, {
      roleId: dto.role_id,
      department: dto.department,
      jobLevel: dto.job_level,
      location: dto.location,
      allowedComplexes: dto.allowed_complexes,
      ipWhitelist: dto.ip_whitelist,
      active: dto.active,
      startDate: dto.start_date,
      endDate: dto.end_date ?? undefined,
    });

    const updated =
      await this.companyUserRepository.findByIdWithRelations(companyUserId);

    if (!updated) {
      throw new NotFoundException('Erro ao buscar usuário atualizado.');
    }

    return updated;
  }
}
