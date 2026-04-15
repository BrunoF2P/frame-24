import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from 'src/prisma/prisma.service';
import { CustomersRepository } from '../repositories/customers.repository';
import { EmailService } from 'src/modules/email/services/email.service';
import { LoggerService } from 'src/common/services/logger.service';

type CustomerContext = {
  companyId: string;
  customerId: string;
  identityId: string;
};

type EmailChangePayload = {
  customer_id: string;
  identity_id: string;
  previous_email: string;
  new_email: string;
  token_hash: string;
  status: 'pending' | 'confirmed' | 'expired';
  expires_at: string;
};

const EMAIL_CHANGE_RESOURCE = 'CUSTOMER_EMAIL_CHANGE';
const PRIVACY_RESOURCE = 'CUSTOMER_PRIVACY';

@Injectable()
export class CustomerAccountService {
  constructor(
    private readonly cls: ClsService,
    private readonly prisma: PrismaService,
    private readonly customersRepository: CustomersRepository,
    private readonly emailService: EmailService,
    private readonly logger: LoggerService,
  ) {}

  private getContext(): CustomerContext {
    const companyId = this.cls.get<string>('companyId');
    const customerId = this.cls.get<string>('customerId');
    const identityId = this.cls.get<string>('identityId');

    if (!companyId || !customerId || !identityId) {
      throw new ForbiddenException('Contexto do cliente não encontrado.');
    }

    return { companyId, customerId, identityId };
  }

  async requestEmailChange(newEmail: string) {
    const context = this.getContext();
    const customer = await this.customersRepository.findById(context.customerId);

    if (!customer) {
      throw new NotFoundException('Cliente não encontrado');
    }

    const currentEmail = (customer.email || '').trim().toLowerCase();
    const normalizedNewEmail = newEmail.trim().toLowerCase();

    if (!normalizedNewEmail) {
      throw new BadRequestException('Informe um novo e-mail válido.');
    }

    if (normalizedNewEmail === currentEmail) {
      throw new BadRequestException(
        'O novo e-mail deve ser diferente do e-mail atual.',
      );
    }

    const existingCustomer = await this.prisma.customers.findFirst({
      where: {
        email: normalizedNewEmail,
      },
    });

    if (existingCustomer && existingCustomer.id !== customer.id) {
      throw new BadRequestException('Este e-mail já está em uso.');
    }

    const requestId = randomBytes(16).toString('hex');
    const token = randomBytes(24).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const payload: EmailChangePayload = {
      customer_id: context.customerId,
      identity_id: context.identityId,
      previous_email: currentEmail,
      new_email: normalizedNewEmail,
      token_hash: tokenHash,
      status: 'pending',
      expires_at: expiresAt.toISOString(),
    };

    await this.prisma.audit_logs.create({
      data: {
        company_id: context.companyId,
        event_type: 'customer.email_change.requested',
        resource_type: EMAIL_CHANGE_RESOURCE,
        resource_id: requestId,
        action: 'EMAIL_CHANGE_REQUESTED',
        user_id: context.customerId,
        old_values: {
          previous_email: currentEmail,
        },
        new_values: payload,
      },
    });

    await this.emailService.sendEmailChangeConfirmationEmail({
      to: normalizedNewEmail,
      customerName: customer.full_name,
      requestId,
      token,
      expiresAt,
    });

    return {
      request_id: requestId,
      expires_at: expiresAt.toISOString(),
      destination_email: normalizedNewEmail,
    };
  }

  async confirmEmailChange(requestId: string, token: string) {
    const context = this.getContext();
    const requestLog = await this.prisma.audit_logs.findFirst({
      where: {
        resource_type: EMAIL_CHANGE_RESOURCE,
        resource_id: requestId,
        action: 'EMAIL_CHANGE_REQUESTED',
        user_id: context.customerId,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!requestLog) {
      throw new NotFoundException('Solicitação de troca de e-mail não encontrada.');
    }

    const payload = requestLog.new_values as EmailChangePayload | null;
    if (!payload || payload.status !== 'pending') {
      throw new BadRequestException('Solicitação inválida ou já processada.');
    }

    if (payload.customer_id !== context.customerId) {
      throw new ForbiddenException('Solicitação não pertence ao cliente autenticado.');
    }

    const expiresAt = new Date(payload.expires_at);
    if (Number.isNaN(expiresAt.getTime()) || Date.now() > expiresAt.getTime()) {
      await this.prisma.audit_logs.create({
        data: {
          company_id: context.companyId,
          event_type: 'customer.email_change.expired',
          resource_type: EMAIL_CHANGE_RESOURCE,
          resource_id: requestId,
          action: 'EMAIL_CHANGE_EXPIRED',
          user_id: context.customerId,
          old_values: payload,
          new_values: { ...payload, status: 'expired' },
        },
      });
      throw new BadRequestException('O token de confirmação expirou.');
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    if (payload.token_hash !== tokenHash) {
      throw new BadRequestException('Token de confirmação inválido.');
    }

    const duplicated = await this.prisma.customers.findFirst({
      where: {
        email: payload.new_email,
        NOT: {
          id: context.customerId,
        },
      },
    });

    if (duplicated) {
      throw new BadRequestException('Este e-mail já está em uso.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.customers.update({
        where: { id: context.customerId },
        data: { email: payload.new_email },
      });

      await tx.identities.update({
        where: { id: context.identityId },
        data: {
          email: payload.new_email,
          email_verified: true,
        },
      });

      await tx.audit_logs.create({
        data: {
          company_id: context.companyId,
          event_type: 'customer.email_change.confirmed',
          resource_type: EMAIL_CHANGE_RESOURCE,
          resource_id: requestId,
          action: 'EMAIL_CHANGE_CONFIRMED',
          user_id: context.customerId,
          old_values: payload,
          new_values: {
            ...payload,
            status: 'confirmed',
            confirmed_at: new Date().toISOString(),
          },
        },
      });
    });

    return {
      request_id: requestId,
      email: payload.new_email,
      status: 'confirmed' as const,
    };
  }

  async listActiveSessions() {
    const context = this.getContext();
    const sessions = await this.prisma.user_sessions.findMany({
      where: {
        identity_id: context.identityId,
        active: true,
        revoked: false,
      },
      orderBy: {
        last_activity: 'desc',
      },
    });

    const currentSessionId = sessions[0]?.id;

    return sessions.map((session) => ({
      id: session.id,
      session_id: session.session_id,
      ip_address: session.ip_address,
      user_agent: session.user_agent,
      device_label: this.buildDeviceLabel(session.user_agent),
      last_activity: session.last_activity?.toISOString() ?? null,
      expires_at: session.expires_at.toISOString(),
      is_current: session.id === currentSessionId,
    }));
  }

  async revokeSessionById(sessionId: string) {
    const context = this.getContext();
    const session = await this.prisma.user_sessions.findFirst({
      where: {
        id: sessionId,
        identity_id: context.identityId,
        active: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Sessão não encontrada.');
    }

    await this.prisma.user_sessions.update({
      where: { id: sessionId },
      data: {
        active: false,
        revoked: true,
        revoked_at: new Date(),
      },
    });

    return { success: true };
  }

  async revokeOtherSessions(keepSessionId?: string) {
    const context = this.getContext();
    const sessions = await this.prisma.user_sessions.findMany({
      where: {
        identity_id: context.identityId,
        active: true,
        revoked: false,
      },
      orderBy: {
        last_activity: 'desc',
      },
    });

    if (sessions.length <= 1) {
      return {
        success: true,
        revoked_count: 0,
        kept_session_id: sessions[0]?.id ?? null,
      };
    }

    const fallbackKeep = sessions[0]?.id ?? null;
    const allowedKeep = keepSessionId
      ? sessions.find((session) => session.id === keepSessionId)?.id ?? fallbackKeep
      : fallbackKeep;

    const idsToRevoke = sessions
      .map((session) => session.id)
      .filter((id) => id !== allowedKeep);

    const result = await this.prisma.user_sessions.updateMany({
      where: {
        id: {
          in: idsToRevoke,
        },
        identity_id: context.identityId,
        active: true,
      },
      data: {
        active: false,
        revoked: true,
        revoked_at: new Date(),
      },
    });

    return {
      success: true,
      revoked_count: result.count,
      kept_session_id: allowedKeep,
    };
  }

  async requestDataExport(format: 'json' = 'json') {
    const context = this.getContext();
    const requestId = randomBytes(16).toString('hex');

    await this.prisma.audit_logs.create({
      data: {
        company_id: context.companyId,
        event_type: 'customer.privacy.export_requested',
        resource_type: PRIVACY_RESOURCE,
        resource_id: requestId,
        action: 'DATA_EXPORT_REQUESTED',
        user_id: context.customerId,
        new_values: {
          status: 'requested',
          format,
          requested_at: new Date().toISOString(),
        },
      },
    });

    return {
      request_id: requestId,
      status: 'requested' as const,
      format,
    };
  }

  async requestDelete(reason?: string) {
    const context = this.getContext();
    const requestId = randomBytes(16).toString('hex');

    await this.prisma.$transaction(async (tx) => {
      await tx.customers.update({
        where: { id: context.customerId },
        data: {
          anonymization_requested: true,
        },
      });

      await tx.audit_logs.create({
        data: {
          company_id: context.companyId,
          event_type: 'customer.privacy.delete_requested',
          resource_type: PRIVACY_RESOURCE,
          resource_id: requestId,
          action: 'ACCOUNT_DELETE_REQUESTED',
          user_id: context.customerId,
          new_values: {
            status: 'requested',
            reason: reason ?? null,
            requested_at: new Date().toISOString(),
          },
        },
      });
    });

    this.logger.log(
      `Solicitação de exclusão criada para customer=${context.customerId}`,
      CustomerAccountService.name,
    );

    return {
      request_id: requestId,
      status: 'requested' as const,
    };
  }

  private buildDeviceLabel(userAgent?: string | null): string {
    if (!userAgent) {
      return 'Dispositivo não identificado';
    }

    const normalized = userAgent.toLowerCase();
    if (normalized.includes('iphone')) return 'iPhone';
    if (normalized.includes('android')) return 'Android';
    if (normalized.includes('ipad')) return 'iPad';
    if (normalized.includes('macintosh') || normalized.includes('mac os'))
      return 'Mac';
    if (normalized.includes('windows')) return 'Windows';
    if (normalized.includes('linux')) return 'Linux';

    return 'Navegador web';
  }
}
