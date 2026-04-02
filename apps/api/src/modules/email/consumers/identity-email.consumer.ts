import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Channel, ChannelModel, ConsumeMessage, connect } from 'amqplib';
import { EmailService } from '../services/email.service';
import {
  IdentityCreatedEventData,
  IdentityEventPattern,
  IdentityVerifiedEventData,
  PasswordResetEventData,
} from 'src/modules/identity/events/identity.events';
import { requireEnv } from 'src/config/env.util';

interface IdentityMessage {
  pattern: string;
  data: IdentityCreatedEventData | IdentityVerifiedEventData;
  metadata?: {
    userId?: string;
    companyId?: string;
    correlationId?: string;
    timestamp?: string;
  };
}

@Injectable()
export class IdentityEmailConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('IdentityEmailConsumer');
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;

  constructor(private emailService: EmailService) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Iniciando consumer de emails...');
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
    this.logger.log('Consumer desconectado');
  }

  private async connect(): Promise<void> {
    try {
      const uri = process.env.RABBITMQ_URI;
      let url: string;

      if (uri) {
        url = uri;
      } else {
        const user = requireEnv('RABBITMQ_USER', 'test');
        const password = requireEnv('RABBITMQ_PASSWORD', 'test');
        const host = requireEnv('RABBITMQ_HOST', 'localhost');
        const port = requireEnv('RABBITMQ_PORT', '5672');
        url = `amqp://${user}:${password}@${host}:${port}`;
      }

      this.connection = await connect(url);
      this.channel = await this.connection.createChannel();

      await this.channel.assertExchange('frame24-events', 'topic', {
        durable: true,
      });

      await this.channel.assertExchange('frame24-dlx', 'topic', {
        durable: true,
      });
      await this.channel.assertQueue('email-queue-dlq', { durable: true });
      await this.channel.bindQueue('email-queue-dlq', 'frame24-dlx', '#');

      await this.channel.assertQueue('email-queue-retry', {
        durable: true,
        messageTtl: 10000,
        deadLetterExchange: 'frame24-events',
        deadLetterRoutingKey: 'identity.created',
      });

      await this.channel.assertQueue('email-queue', {
        durable: true,
        deadLetterExchange: 'frame24-dlx',
      });

      await this.channel.bindQueue(
        'email-queue',
        'frame24-events',
        'identity.#',
      );
      this.logger.log('Conectado ao RabbitMQ! Escutando mensagens...');

      await this.channel.consume(
        'email-queue',
        (msg: ConsumeMessage | null) => {
          if (!msg) return;

          this.processMessage(msg).catch(() => {});
        },
      );
    } catch (error) {
      this.logger.error(
        `Falha na conexão RabbitMQ: ${error instanceof Error ? error.message : String(error)}`,
      );

      setTimeout(() => {
        this.connect().catch((err) => {
          this.logger.error(
            'Reconnect failed',
            err instanceof Error ? err.stack : '',
          );
        });
      }, 10000);
    }
  }

  private async processMessage(msg: ConsumeMessage): Promise<void> {
    try {
      const content = JSON.parse(msg.content.toString()) as IdentityMessage;
      this.logger.log(`Recebido: ${content.pattern}`);

      if (content.pattern?.startsWith('identity.')) {
        await this.handleIdentityEvent(content);
        this.logger.log(`Processado: ${content.pattern}`);
      }

      this.channel?.ack(msg);
    } catch (error) {
      const retryCount = (msg.properties.headers?.['x-retry-count'] ||
        0) as number;
      const MAX_RETRIES = 5;

      this.logger.error(
        `Erro ao processar mensagem (tentativa ${retryCount + 1}/${MAX_RETRIES}): ${error instanceof Error ? error.message : 'Unknown'}`,
      );

      if (retryCount >= MAX_RETRIES) {
        this.logger.error('Max retries reached. Sending to DLQ.');
        this.channel?.nack(msg, false, false);
      } else {
        this.logger.warn(
          `Sending to retry queue (will retry in 5s) - Attempt ${retryCount + 1}/${MAX_RETRIES}`,
        );

        this.channel?.sendToQueue('email-queue-retry', msg.content, {
          persistent: true,
          headers: {
            ...msg.properties.headers,
            'x-retry-count': retryCount + 1,
          },
        });

        this.channel?.ack(msg);
      }
    }
  }

  private async handleIdentityEvent(message: IdentityMessage): Promise<void> {
    switch (message.pattern) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
      case IdentityEventPattern.CREATED:
        this.handleIdentityCreated(message.data as IdentityCreatedEventData);
        break;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
      case IdentityEventPattern.VERIFIED:
        this.handleIdentityVerified(message.data as IdentityVerifiedEventData);
        break;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
      case IdentityEventPattern.PASSWORD_RESET:
        await this.handlePasswordReset(message.data as PasswordResetEventData);
        break;
      default:
        this.logger.warn(`Padrão desconhecido: ${message.pattern}`);
    }
  }

  private handleIdentityCreated(data: IdentityCreatedEventData): void {
    this.logger.log(`Processando identity.created: ${data.email}`);

    // DISABLED: Auto-verification enabled, skipping email.
    // await this.emailService.sendVerificationEmail(
    //   data.email,
    //   data.full_name,
    //   data.verification_token,
    // );

    this.logger.log(
      `Email de verificação PULADO (Auto-verificação): ${data.email}`,
    );
  }

  private handleIdentityVerified(data: IdentityVerifiedEventData): void {
    this.logger.log(`Processando identity.verified: ${data.email}`);

    // DISABLED: User requested no emails.
    // await this.emailService.sendWelcomeEmail(data.email, data.full_name);

    this.logger.log(`Email de boas-vindas PULADO (Desativado): ${data.email}`);
  }

  private async handlePasswordReset(
    data: PasswordResetEventData,
  ): Promise<void> {
    this.logger.log(`Processando identity.password_reset: ${data.email}`);

    await this.emailService.sendPasswordResetEmail(
      data.email,
      data.full_name,
      data.reset_token,
    );

    this.logger.log(
      `Email de redefinição de senha enviado para: ${data.email}`,
    );
  }
}
