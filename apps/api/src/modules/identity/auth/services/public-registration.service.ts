import { ConflictException, Injectable } from '@nestjs/common';
import { identity_type } from '@repo/db';
import { PrismaService } from 'src/prisma/prisma.service';
import { CompanyService } from 'src/modules/identity/companies/services/company.service';
import { MasterDataSetupService } from 'src/modules/setup/services/master-data-setup.service';
import { TaxSetupService } from 'src/modules/tax/services/tax-setup.service';
import { KeycloakProvisioningService } from 'src/common/services/keycloak-provisioning.service';
import {
  PublicRegisterDto,
  PublicRegisterResponseDto,
} from '../dto/public-register.dto';
import { EmployeeIdGeneratorService } from './employee-id-generator';

@Injectable()
export class PublicRegistrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyService: CompanyService,
    private readonly employeeIdGenerator: EmployeeIdGeneratorService,
    private readonly masterDataSetupService: MasterDataSetupService,
    private readonly taxSetupService: TaxSetupService,
    private readonly keycloakProvisioning: KeycloakProvisioningService,
  ) {}

  async register(dto: PublicRegisterDto): Promise<PublicRegisterResponseDto> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const existingIdentity = await this.prisma.identities.findFirst({
      where: {
        email: normalizedEmail,
        identity_type: identity_type.EMPLOYEE,
      },
    });

    if (existingIdentity) {
      throw new ConflictException('Email já cadastrado.');
    }

    let keycloakUserId: string | null = null;

    try {
      keycloakUserId = await this.keycloakProvisioning.createUser({
        email: normalizedEmail,
        fullName: dto.full_name,
        password: dto.password,
      });

      return await this.createLocalRegistration(
        dto,
        normalizedEmail,
        keycloakUserId,
      );
    } catch (error) {
      if (keycloakUserId) {
        await this.deleteKeycloakUser(keycloakUserId);
      }

      throw error;
    }
  }

  private async createLocalRegistration(
    dto: PublicRegisterDto,
    normalizedEmail: string,
    keycloakUserId: string,
  ): Promise<PublicRegisterResponseDto> {
    const company = await this.companyService.create({
      corporate_name: dto.corporate_name,
      trade_name: dto.trade_name,
      cnpj: dto.cnpj,
      zip_code: dto.company_zip_code,
      street_address: dto.company_street_address,
      address_number: dto.company_address_number,
      address_complement: dto.company_address_complement,
      neighborhood: dto.company_neighborhood,
      city: dto.company_city,
      state: dto.company_state,
      phone: dto.company_phone,
      email: dto.company_email,
      plan_type: dto.plan_type,
    });

    // Seed dos dados mestres obrigatórios da nova empresa.
    await this.masterDataSetupService.setupCompanyMasterData(company.id);

    await this.taxSetupService.setupCompanyTaxes({
      companyId: company.id,
      taxRegime: company.tax_regime,
      zipCode: dto.company_zip_code,
      city: dto.company_city,
      state: dto.company_state,
    });

    const person = await this.prisma.persons.create({
      data: {
        full_name: dto.full_name,
        email: normalizedEmail,
        mobile: dto.mobile,
      },
    });

    const identity = await this.prisma.identities.create({
      data: {
        person_id: person.id,
        email: normalizedEmail,
        identity_type: identity_type.EMPLOYEE,
        external_id: keycloakUserId,
        active: true,
        email_verified: true,
      },
    });

    const role = await this.prisma.custom_roles.upsert({
      where: {
        company_id_name: {
          company_id: company.id,
          name: 'SUPER_ADMIN',
        },
      },
      update: {},
      create: {
        company_id: company.id,
        name: 'SUPER_ADMIN',
        description: 'Administrador da empresa',
        hierarchy_level: 1,
        is_system_role: true,
      },
    });

    const employeeId = await this.employeeIdGenerator.generate(company.id);

    await this.prisma.company_users.create({
      data: {
        company_id: company.id,
        identity_id: identity.id,
        role_id: role.id,
        employee_id: employeeId,
        active: true,
        start_date: new Date(),
      },
    });

    return {
      success: true,
      message:
        'Cadastro realizado com sucesso. Verifique seu email e redefina sua senha no primeiro acesso.',
      company_id: company.id,
      tenant_slug: company.tenant_slug,
      email: normalizedEmail,
    };
  }

  private async deleteKeycloakUser(userId: string): Promise<void> {
    try {
      await this.keycloakProvisioning.deleteUser(userId);
    } catch {
      // no-op cleanup best effort
    }
  }
}
