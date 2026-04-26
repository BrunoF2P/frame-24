import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { CustomersRepository } from '../repositories/customers.repository';
import { CompanyCustomersRepository } from '../repositories/company-customers.repository';
import { RegisterCustomerDto } from '../dto/register-customer.dto';
import { CustomerRegisterResponseDto } from '../dto/customer-register-response.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { LoggerService } from 'src/common/services/logger.service';
import { Password } from 'src/modules/identity/auth/domain/value-objects/password.value-object';
import { auth } from 'src/lib/auth';
import {
  fromTenantAuthEmail,
  toTenantAuthEmail,
} from '../utils/tenant-auth-email';

@Injectable()
export class CustomerAuthService {
  constructor(
    private readonly customersRepository: CustomersRepository,
    private readonly companyCustomersRepository: CompanyCustomersRepository,
    private readonly prisma: PrismaService,
    private readonly snowflake: SnowflakeService,
    private readonly logger: LoggerService,
  ) {}

  @Transactional()
  async register(
    dto: RegisterCustomerDto,
  ): Promise<CustomerRegisterResponseDto> {
    const company = await this.prisma.companies.findFirst({
      where: {
        ...(dto.company_id
          ? { id: dto.company_id }
          : { tenant_slug: dto.tenant_slug }),
      },
    });

    if (!company || !company.active || company.suspended) {
      throw new NotFoundException('Empresa não encontrada ou inativa');
    }

    const normalizedEmail = dto.email.trim().toLowerCase();
    const normalizedCpf = dto.cpf.replace(/\D/g, '');
    const tenantAuthEmail = toTenantAuthEmail(
      company.tenant_slug,
      normalizedEmail,
    );

    const existingCustomer = await this.prisma.customers.findFirst({
      where: {
        email: normalizedEmail,
        company_customers: {
          some: {
            company_id: company.id,
          },
        },
      },
    });
    if (existingCustomer) {
      throw new ConflictException('Email já cadastrado nesta empresa');
    }

    const existingCpf = await this.prisma.customers.findFirst({
      where: {
        cpf: normalizedCpf,
        company_customers: {
          some: {
            company_id: company.id,
          },
        },
      },
    });
    if (existingCpf) {
      throw new ConflictException('CPF já cadastrado nesta empresa');
    }

    const existingAuthUser = await this.prisma.user.findUnique({
      where: {
        email: tenantAuthEmail,
      },
    });
    if (existingAuthUser) {
      throw new ConflictException('Email já cadastrado nesta empresa');
    }

    const password = await Password.create(dto.password);
    const signUpResult = await auth.api.signUpEmail({
      body: {
        name: dto.full_name,
        email: tenantAuthEmail,
        password: dto.password,
        callbackURL: '/',
        rememberMe: false,
      },
    });

    const authUserId = signUpResult?.user?.id;
    if (!authUserId) {
      throw new Error('Falha ao provisionar usuário do cliente.');
    }

    let customerId: string | null = null;
    try {
      const identity = await this.prisma.identities.create({
        data: {
          id: this.snowflake.generate(),
          email: tenantAuthEmail,
          external_id: authUserId,
          identity_type: 'CUSTOMER',
          password_hash: password.hash,
          password_changed_at: new Date(),
          active: true,
          email_verified: true,
        },
      });

      const customer = await this.customersRepository.create({
        identity_id: identity.id,
        cpf: normalizedCpf,
        full_name: dto.full_name,
        email: normalizedEmail,
        phone: dto.phone,
        ...(dto.birth_date && { birth_date: new Date(dto.birth_date) }),
        accepts_marketing: dto.accepts_marketing || false,
        accepts_email: dto.accepts_email !== false,
        accepts_sms: dto.accepts_sms || false,
        terms_accepted: true,
        terms_acceptance_date: new Date(),
        active: true,
        registration_source: 'WEB',
      });
      customerId = customer.id;

      await this.companyCustomersRepository.create({
        company_id: company.id,
        customers: { connect: { id: customer.id } },
        is_active_in_loyalty: true,
        loyalty_level: 'BRONZE',
        accumulated_points: 0,
        loyalty_join_date: new Date(),
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

    this.logger.log(
      `Customer registered with identity provider: ${normalizedEmail} for company ${company.id}`,
      CustomerAuthService.name,
    );

    return {
      success: true,
      message:
        'Cadastro realizado com sucesso. Faça login para acessar sua conta.',
      customer_id: customerId as string,
      tenant_slug: company.tenant_slug,
      email: normalizedEmail,
    };
  }

  @Transactional()
  async activateAccess(
    dto: {
      company_id: string;
      full_name: string;
      cpf: string;
      phone?: string;
      birth_date?: string;
      accepts_marketing?: boolean;
      accepts_email?: boolean;
      accepts_sms?: boolean;
    },
    sessionEmail: string,
  ): Promise<CustomerRegisterResponseDto> {
    const company = await this.prisma.companies.findUnique({
      where: { id: dto.company_id },
    });

    if (!company || !company.active || company.suspended) {
      throw new NotFoundException('Empresa não encontrada ou inativa');
    }

    const sessionAuthEmail = sessionEmail.trim().toLowerCase();
    const normalizedSessionEmail = fromTenantAuthEmail(sessionAuthEmail);
    const normalizedCpf = dto.cpf.replace(/\D/g, '');
    const cpfWithMask = normalizedCpf.replace(
      /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
      '$1.$2.$3-$4',
    );
    const cpfCandidates = Array.from(
      new Set([dto.cpf, normalizedCpf, cpfWithMask].filter(Boolean)),
    );

    let customer = await this.customersRepository.findByEmail(
      normalizedSessionEmail,
    );
    const customerByCpf = await this.prisma.customers.findFirst({
      where: {
        cpf: {
          in: cpfCandidates,
        },
      },
    });

    if (!customer && customerByCpf) {
      customer = customerByCpf;
    }

    if (customer && customer.email) {
      const normalizedCustomerEmail = customer.email.trim().toLowerCase();
      if (normalizedCustomerEmail !== normalizedSessionEmail) {
        throw new UnauthorizedException(
          'A sessão ativa não corresponde ao cadastro informado.',
        );
      }
    }

    if (!customer) {
      const existingIdentity = await this.prisma.identities.findFirst({
        where: {
          email: sessionAuthEmail,
          identity_type: 'CUSTOMER',
          active: true,
        },
      });

      const identity =
        existingIdentity ??
        (await this.prisma.identities.create({
            data: {
              id: this.snowflake.generate(),
              email: sessionAuthEmail,
              identity_type: 'CUSTOMER',
              active: true,
            email_verified: true,
          },
        }));

      customer = await this.customersRepository.create({
        identity_id: identity.id,
        cpf: normalizedCpf,
        full_name: dto.full_name,
        email: normalizedSessionEmail,
        phone: dto.phone,
        ...(dto.birth_date && { birth_date: new Date(dto.birth_date) }),
        accepts_marketing: dto.accepts_marketing || false,
        accepts_email: dto.accepts_email !== false,
        accepts_sms: dto.accepts_sms || false,
        terms_accepted: true,
        terms_acceptance_date: new Date(),
        active: true,
        blocked: false,
        block_reason: null,
        registration_source: 'WEB',
      });
    } else {
      customer = await this.customersRepository.update(customer.id, {
        cpf: normalizedCpf,
        full_name: dto.full_name,
        email: normalizedSessionEmail,
        phone: dto.phone,
        ...(dto.birth_date && { birth_date: new Date(dto.birth_date) }),
        accepts_marketing: dto.accepts_marketing || false,
        accepts_email: dto.accepts_email !== false,
        accepts_sms: dto.accepts_sms || false,
        terms_accepted: true,
        terms_acceptance_date: new Date(),
        active: true,
        blocked: false,
        block_reason: null,
      });
    }

    const existingLink =
      await this.companyCustomersRepository.findByCompanyAndCustomer(
        dto.company_id,
        customer.id,
      );

    if (!existingLink) {
      await this.companyCustomersRepository.create({
        company_id: dto.company_id,
        customers: { connect: { id: customer.id } },
        is_active_in_loyalty: true,
        loyalty_level: 'BRONZE',
        accumulated_points: 0,
        loyalty_join_date: new Date(),
      });
    } else {
      await this.companyCustomersRepository.update(
        dto.company_id,
        customer.id,
        {
          is_active_in_loyalty: true,
          loyalty_level: existingLink.loyalty_level ?? 'BRONZE',
          accumulated_points: existingLink.accumulated_points ?? 0,
          loyalty_join_date: existingLink.loyalty_join_date ?? new Date(),
        },
      );
    }

    return {
      success: true,
      message: 'Acesso validado com sucesso para este cinema.',
      customer_id: customer.id,
      tenant_slug: company.tenant_slug,
      email: normalizedSessionEmail,
    };
  }
}
