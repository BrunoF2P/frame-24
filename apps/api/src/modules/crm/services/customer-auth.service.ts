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
import { LoginCustomerDto } from '../dto/login-customer.dto';
import { CustomerAuthResponseDto } from '../dto/customer-auth-response.dto';
import { CustomerRegisterResponseDto } from '../dto/customer-register-response.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { LoggerService } from 'src/common/services/logger.service';
import { KeycloakProvisioningService } from 'src/common/services/keycloak-provisioning.service';

const AUTHENTIK_CUSTOMER_GROUP =
  process.env.AUTHENTIK_CUSTOMER_GROUP ?? 'Frame24 Customers';

@Injectable()
export class CustomerAuthService {
  constructor(
    private readonly customersRepository: CustomersRepository,
    private readonly companyCustomersRepository: CompanyCustomersRepository,
    private readonly prisma: PrismaService,
    private readonly snowflake: SnowflakeService,
    private readonly logger: LoggerService,
    private readonly keycloakProvisioning: KeycloakProvisioningService,
  ) {}

  @Transactional()
  async register(
    dto: RegisterCustomerDto,
  ): Promise<CustomerRegisterResponseDto> {
    const company = await this.prisma.companies.findUnique({
      where: { id: dto.company_id },
    });

    if (!company || !company.active || company.suspended) {
      throw new NotFoundException('Empresa não encontrada ou inativa');
    }

    const existingCustomer = await this.customersRepository.findByEmail(
      dto.email,
    );
    if (existingCustomer) {
      throw new ConflictException('Email já cadastrado');
    }

    const existingCpf = await this.customersRepository.findByCpf(dto.cpf);
    if (existingCpf) {
      throw new ConflictException('CPF já cadastrado');
    }

    let keycloakUserId: string | null = null;

    try {
      keycloakUserId = await this.keycloakProvisioning.createUser({
        email: dto.email,
        fullName: dto.full_name,
        password: dto.password,
        realmRoles: ['FRAME24_CUSTOMER'],
        groups: [AUTHENTIK_CUSTOMER_GROUP],
      });

      const identity = await this.prisma.identities.create({
        data: {
          id: this.snowflake.generate(),
          email: dto.email,
          identity_type: 'CUSTOMER',
          external_id: keycloakUserId,
          active: true,
          email_verified: true,
        },
      });

      const customer = await this.customersRepository.create({
        identity_id: identity.id,
        cpf: dto.cpf,
        full_name: dto.full_name,
        email: dto.email,
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

      await this.companyCustomersRepository.create({
        company_id: dto.company_id,
        customers: { connect: { id: customer.id } },
        is_active_in_loyalty: true,
        loyalty_level: 'BRONZE',
        accumulated_points: 0,
        loyalty_join_date: new Date(),
      });

      this.logger.log(
        `Customer registered with Authentik: ${dto.email} for company ${dto.company_id}`,
        CustomerAuthService.name,
      );

      return {
        success: true,
        message:
          'Cadastro realizado com sucesso. Faça login pelo Authentik para acessar sua conta.',
        customer_id: customer.id,
        tenant_slug: company.tenant_slug,
        email: dto.email,
      };
    } catch (error) {
      if (keycloakUserId) {
        await this.deleteKeycloakUser(keycloakUserId);
      }
      throw error;
    }
  }

  async login(dto: LoginCustomerDto): Promise<CustomerAuthResponseDto> {
    const company = await this.prisma.companies.findUnique({
      where: { id: dto.company_id },
    });

    if (!company || !company.active || company.suspended) {
      throw new NotFoundException('Empresa não encontrada ou inativa');
    }

    throw new UnauthorizedException(
      'Login por credenciais desativado. Use o login via Authentik.',
    );
  }

  private async deleteKeycloakUser(userId: string): Promise<void> {
    try {
      await this.keycloakProvisioning.deleteUser(userId);
    } catch {
      // no-op cleanup best effort
    }
  }
}
