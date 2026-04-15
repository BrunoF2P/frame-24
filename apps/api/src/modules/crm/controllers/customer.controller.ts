import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { ClsService } from 'nestjs-cls';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CustomerGuard } from 'src/common/guards/customer.guard';
import { AllowAnonymousSession } from 'src/common/decorators/allow-anonymous-session.decorator';
import { CustomersRepository } from '../repositories/customers.repository';
import { CompanyCustomersRepository } from '../repositories/company-customers.repository';
import { UpdateCustomerProfileDto } from '../dto/update-customer-profile.dto';
import {
  ConfirmCustomerEmailChangeDto,
  RequestCustomerEmailChangeDto,
} from '../dto/customer-email-change.dto';
import { RevokeOtherSessionsDto } from '../dto/customer-security.dto';
import {
  RequestCustomerDataExportDto,
  RequestCustomerDeleteDto,
} from '../dto/customer-privacy.dto';
import { CustomerAccountService } from '../services/customer-account.service';
import { PrismaService } from 'src/prisma/prisma.service';

@ApiTags('Customer')
@ApiBearerAuth()
@Controller({ path: 'customer', version: '1' })
export class CustomerController {
  constructor(
    private readonly customersRepository: CustomersRepository,
    private readonly companyCustomersRepository: CompanyCustomersRepository,
    private readonly customerAccountService: CustomerAccountService,
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  private getContext(): {
    companyId: string;
    customerId: string;
    tenantSlug?: string;
  } {
    const companyId = this.cls.get<string>('companyId');
    const customerId = this.cls.get<string>('customerId');
    const tenantSlug = this.cls.get<string>('tenantSlug');

    if (!companyId || !customerId) {
      throw new ForbiddenException('Contexto do cliente não encontrado.');
    }

    return { companyId, customerId, tenantSlug };
  }

  @Get('profile/resolve')
  @UseGuards(JwtAuthGuard)
  @AllowAnonymousSession()
  @ApiOperation({
    summary: 'Resolver perfil do cliente para sessão atual',
    description:
      'Retorna o perfil quando a sessão atual é de cliente. Para sessão de funcionário, retorna null.',
  })
  async resolveProfile() {
    const sessionContext = this.cls.get<'EMPLOYEE' | 'CUSTOMER'>(
      'sessionContext',
    );

    if (sessionContext !== 'CUSTOMER') {
      return { profile: null };
    }

    const profile = await this.getProfile();
    return { profile };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard, CustomerGuard)
  @ApiOperation({
    summary: 'Obter perfil do cliente',
    description: 'Retorna os dados do cliente autenticado',
  })
  async getProfile() {
    const context = this.getContext();
    const customerData = await this.customersRepository.findById(
      context.customerId,
    );

    if (!customerData) {
      throw new NotFoundException('Cliente não encontrado');
    }

    const companyCustomer =
      await this.companyCustomersRepository.findByCompanyAndCustomer(
        context.companyId,
        context.customerId,
      );

    const linkedCompanyLinks = await this.prisma.company_customers.findMany({
      where: {
        customer_id: context.customerId,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
    const linkedCompanyIds = linkedCompanyLinks.map((item) => item.company_id);
    const linkedCompaniesData = linkedCompanyIds.length
      ? await this.prisma.companies.findMany({
          where: {
            id: {
              in: linkedCompanyIds,
            },
          },
        })
      : [];
    const companyMap = new Map(
      linkedCompaniesData.map((item) => [item.id, item]),
    );

    return {
      id: customerData.id,
      email: customerData.email,
      full_name: customerData.full_name,
      phone: customerData.phone,
      birth_date: customerData.birth_date,
      zip_code: customerData.zip_code,
      address: customerData.address,
      city: customerData.city,
      state: customerData.state,
      accepts_email: customerData.accepts_email,
      accepts_sms: customerData.accepts_sms,
      accepts_marketing: customerData.accepts_marketing,
      loyalty_level: companyCustomer?.loyalty_level || 'BRONZE',
      accumulated_points: companyCustomer?.accumulated_points || 0,
      company_id: context.companyId,
      tenant_slug: context.tenantSlug,
      linked_companies: linkedCompanyLinks
        .filter((item) => companyMap.has(item.company_id))
        .map((item) => ({
          company_id: item.company_id,
          tenant_slug: companyMap.get(item.company_id)?.tenant_slug ?? null,
          company_name: companyMap.get(item.company_id)?.corporate_name ?? null,
          loyalty_level: item.loyalty_level,
          accumulated_points: item.accumulated_points,
        })),
    };
  }

  @Get('points')
  @UseGuards(JwtAuthGuard, CustomerGuard)
  @ApiOperation({
    summary: 'Obter pontos de fidelidade',
    description: 'Retorna os pontos acumulados do cliente',
  })
  async getPoints() {
    const context = this.getContext();
    const companyCustomer =
      await this.companyCustomersRepository.findByCompanyAndCustomer(
        context.companyId,
        context.customerId,
      );

    return {
      accumulated_points: companyCustomer?.accumulated_points || 0,
      loyalty_level: companyCustomer?.loyalty_level || 'BRONZE',
    };
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard, CustomerGuard)
  @ApiOperation({
    summary: 'Atualizar perfil do cliente',
    description: 'Permite que o cliente atualize seus próprios dados básicos',
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil atualizado com sucesso',
  })
  async updateProfile(@Body() dto: UpdateCustomerProfileDto) {
    const context = this.getContext();
    const customerData = await this.customersRepository.findById(
      context.customerId,
    );

    if (!customerData) {
      throw new NotFoundException('Cliente não encontrado');
    }

    const updateData: {
      full_name?: string;
      phone?: string;
      birth_date?: Date | null;
      zip_code?: string | null;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      accepts_email?: boolean;
      accepts_sms?: boolean;
      accepts_marketing?: boolean;
    } = {};

    if (dto.full_name !== undefined) {
      updateData.full_name = dto.full_name;
    }

    if (dto.phone !== undefined) {
      updateData.phone = dto.phone;
    }

    if (dto.birth_date !== undefined) {
      updateData.birth_date = dto.birth_date ? new Date(dto.birth_date) : null;
    }

    if (dto.zip_code !== undefined) {
      updateData.zip_code = dto.zip_code || null;
    }

    if (dto.address !== undefined) {
      updateData.address = dto.address || null;
    }

    if (dto.city !== undefined) {
      updateData.city = dto.city || null;
    }

    if (dto.state !== undefined) {
      updateData.state = dto.state || null;
    }

    if (dto.accepts_email !== undefined) {
      updateData.accepts_email = dto.accepts_email;
    }

    if (dto.accepts_sms !== undefined) {
      updateData.accepts_sms = dto.accepts_sms;
    }

    if (dto.accepts_marketing !== undefined) {
      updateData.accepts_marketing = dto.accepts_marketing;
    }

    const updated = await this.customersRepository.update(
      context.customerId,
      updateData,
    );

    return {
      id: updated.id,
      email: updated.email,
      full_name: updated.full_name,
      phone: updated.phone,
      birth_date: updated.birth_date,
      zip_code: updated.zip_code,
      address: updated.address,
      city: updated.city,
      state: updated.state,
      accepts_email: updated.accepts_email,
      accepts_sms: updated.accepts_sms,
      accepts_marketing: updated.accepts_marketing,
    };
  }

  @Post('profile/email-change/request')
  @UseGuards(JwtAuthGuard, CustomerGuard)
  @ApiOperation({
    summary: 'Solicitar troca de e-mail',
    description:
      'Cria solicitação e envia token de confirmação para o novo e-mail informado.',
  })
  async requestEmailChange(@Body() dto: RequestCustomerEmailChangeDto) {
    return this.customerAccountService.requestEmailChange(dto.new_email);
  }

  @Post('profile/email-change/confirm')
  @UseGuards(JwtAuthGuard, CustomerGuard)
  @ApiOperation({
    summary: 'Confirmar troca de e-mail',
    description: 'Confirma a troca após validação do token recebido por e-mail.',
  })
  async confirmEmailChange(@Body() dto: ConfirmCustomerEmailChangeDto) {
    return this.customerAccountService.confirmEmailChange(
      dto.request_id,
      dto.token,
    );
  }

  @Get('security/sessions')
  @UseGuards(JwtAuthGuard, CustomerGuard)
  @ApiOperation({
    summary: 'Listar sessões ativas',
    description:
      'Lista dispositivos e sessões ativas para o cliente autenticado.',
  })
  async listSecuritySessions() {
    return this.customerAccountService.listActiveSessions();
  }

  @Delete('security/sessions/:sessionId')
  @UseGuards(JwtAuthGuard, CustomerGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Encerrar sessão específica',
    description: 'Revoga uma sessão ativa por dispositivo.',
  })
  async revokeSession(@Param('sessionId') sessionId: string): Promise<void> {
    await this.customerAccountService.revokeSessionById(sessionId);
  }

  @Post('security/sessions/revoke-others')
  @UseGuards(JwtAuthGuard, CustomerGuard)
  @ApiOperation({
    summary: 'Encerrar outras sessões',
    description:
      'Mantém somente a sessão escolhida (ou mais recente) e encerra as demais.',
  })
  async revokeOtherSessions(@Body() dto: RevokeOtherSessionsDto) {
    return this.customerAccountService.revokeOtherSessions(dto.keep_session_id);
  }

  @Post('privacy/export')
  @UseGuards(JwtAuthGuard, CustomerGuard)
  @ApiOperation({
    summary: 'Solicitar exportação de dados',
    description: 'Abre solicitação de exportação de dados da conta.',
  })
  async requestDataExport(@Body() dto: RequestCustomerDataExportDto) {
    return this.customerAccountService.requestDataExport(dto.format ?? 'json');
  }

  @Post('privacy/delete-request')
  @UseGuards(JwtAuthGuard, CustomerGuard)
  @ApiOperation({
    summary: 'Solicitar exclusão da conta',
    description: 'Abre solicitação confirmada de exclusão da conta.',
  })
  async requestDelete(@Body() dto: RequestCustomerDeleteDto) {
    return this.customerAccountService.requestDelete(dto.reason);
  }
}
