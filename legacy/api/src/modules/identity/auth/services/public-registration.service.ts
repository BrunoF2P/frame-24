import { ConflictException, Injectable } from '@nestjs/common';
import { identity_type, companies } from '@repo/db';
import { PrismaService } from 'src/prisma/prisma.service';
import { CompanyService } from 'src/modules/identity/companies/services/company.service';
import { MasterDataSetupService } from 'src/modules/setup/services/master-data-setup.service';
import { TaxSetupService } from 'src/modules/tax/services/tax-setup.service';
import { BrasilApiService } from 'src/common/services/brasil-api.service';
import { SlugService } from 'src/common/services/slug.service';
import {
  PublicRegisterDto,
  PublicRegisterResponseDto,
} from '../dto/public-register.dto';
import { EmployeeIdGeneratorService } from './employee-id-generator';
import { auth } from 'src/lib/auth';

@Injectable()
export class PublicRegistrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyService: CompanyService,
    private readonly employeeIdGenerator: EmployeeIdGeneratorService,
    private readonly masterDataSetupService: MasterDataSetupService,
    private readonly taxSetupService: TaxSetupService,
    private readonly brasilApiService: BrasilApiService,
    private readonly slugService: SlugService,
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

    const existingAuthUser = await this.prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingAuthUser) {
      throw new ConflictException('Email já cadastrado.');
    }

    return this.createLocalRegistration(dto, normalizedEmail);
  }

  private async createLocalRegistration(
    dto: PublicRegisterDto,
    normalizedEmail: string,
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

    await this.createDefaultCinemaComplex(company);

    const signUpResult = await auth.api.signUpEmail({
      body: {
        name: dto.full_name,
        email: normalizedEmail,
        password: dto.password,
        callbackURL: '/',
        rememberMe: false,
      },
    });

    const authUserId = signUpResult?.user?.id;
    if (!authUserId) {
      throw new Error('Falha ao provisionar usuário no Better Auth.');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const person = await tx.persons.create({
          data: {
            full_name: dto.full_name,
            email: normalizedEmail,
            mobile: dto.mobile,
          },
        });

        const identity = await tx.identities.create({
          data: {
            person_id: person.id,
            email: normalizedEmail,
            external_id: authUserId,
            identity_type: identity_type.EMPLOYEE,
            active: true,
            email_verified: true,
          },
        });

        const role = await tx.custom_roles.upsert({
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

        await tx.company_users.create({
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
      });
    } catch (error) {
      await this.prisma.user
        .delete({
          where: {
            id: authUserId,
          },
        })
        .catch(() => undefined);

      throw error;
    }
  }

  private async createDefaultCinemaComplex(company: companies) {
    const city = company.city || 'Sem cidade';
    const state = company.state || 'SP';
    const citySlug = this.slugService.generateBase(city);

    let ibgeCode = '0000000';
    try {
      const municipality =
        await this.brasilApiService.getMunicipalityByCityAndState(city, state);
      if (municipality?.codigo_ibge) {
        ibgeCode = municipality.codigo_ibge;
      }
    } catch {
      // fallback
    }

    const code = `${citySlug}-${(company.cnpj || '0000').slice(-4)}`;
    const address = [
      company.street_address,
      company.address_number,
      company.address_complement,
      company.neighborhood,
    ]
      .filter(Boolean)
      .join(', ');

    await this.prisma.cinema_complexes.create({
      data: {
        company_id: company.id,
        name: company.trade_name || company.corporate_name,
        code,
        slug: citySlug,
        cnpj: company.cnpj,
        address: address || null,
        city,
        city_slug: citySlug,
        state,
        ibge_municipality_code: ibgeCode,
        active: true,
      },
    });
  }
}
