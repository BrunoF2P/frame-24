import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Channel, ChannelModel, ConsumeMessage, connect } from 'amqplib';
import { AuditWorkerService } from './audit-worker.service';
import { requireEnv } from 'src/config/env.util';

interface AuditMessage {
  pattern: string;
  data: {
    id?: string;
    old_values?: unknown;
    new_values?: unknown;
    [key: string]: unknown;
  };
  metadata?: {
    userId?: string;
    companyId?: string;
    correlationId?: string;
    timestamp?: string;
  };
}

@Injectable()
export class AuditConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('AuditConsumer');
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private isConnecting = false;
  private readonly retryTimers = new Set<NodeJS.Timeout>();
  private static readonly MAX_AUDIT_RETRIES = 5;

  constructor(private auditWorker: AuditWorkerService) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Iniciando consumidor de auditoria...');
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    for (const t of this.retryTimers) {
      clearTimeout(t);
    }
    this.retryTimers.clear();
    await this.close();
  }

  private resolveAmqpUrl(): string {
    const uri = process.env.RABBITMQ_URI?.trim();
    if (uri) {
      return uri;
    }
    const user = requireEnv('RABBITMQ_USER', 'test');
    const password = requireEnv('RABBITMQ_PASSWORD', 'test');
    const host = requireEnv('RABBITMQ_HOST', 'localhost');
    const port = requireEnv('RABBITMQ_PORT', '5672');
    return `amqp://${user}:${password}@${host}:${port}`;
  }

  private async connect(): Promise<void> {
    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      const url = this.resolveAmqpUrl();
      this.connection = await connect(url);

      this.connection.on('error', (err: unknown) => {
        this.logger.error(
          `Erro de conexão: ${err instanceof Error ? err.message : String(err)}`,
        );
        this.handleDisconnect();
      });

      this.connection.on('close', () => {
        this.logger.warn('Conexão AMQP encerrada');
        this.handleDisconnect();
      });

      this.channel = await this.connection.createChannel();
      await this.channel.prefetch(10);

      this.channel.on('error', (err: unknown) => {
        this.logger.error(
          `Erro no canal: ${err instanceof Error ? err.message : String(err)}`,
        );
      });

      this.channel.on('close', () => {
        this.logger.warn('Canal AMQP encerrado');
        this.channel = null;
      });

      await this.channel.assertExchange('frame24-events', 'topic', {
        durable: true,
      });

      await this.channel.assertExchange('frame24-dlx', 'topic', {
        durable: true,
      });

      await this.channel.assertQueue('audit-queue-dlq', { durable: true });
      await this.channel.bindQueue(
        'audit-queue-dlq',
        'frame24-dlx',
        'audit.dlq',
      );

      await this.channel.assertQueue('audit-queue', {
        durable: true,
        deadLetterExchange: 'frame24-dlx',
        deadLetterRoutingKey: 'audit.dlq',
      });

      await this.channel.bindQueue('audit-queue', 'frame24-events', 'audit.#');

      this.logger.log(
        'Consumidor de auditoria ativo (audit-queue → DLQ em falha, sem ack silencioso).',
      );

      await this.channel.consume(
        'audit-queue',
        (msg: ConsumeMessage | null) => {
          if (!msg) return;
          void this.handleDelivery(msg);
        },
        { noAck: false },
      );

      this.isConnecting = false;
    } catch (error) {
      this.isConnecting = false;
      this.logger.error(
        `Falha ao conectar consumidor de auditoria: ${error instanceof Error ? error.message : String(error)}`,
      );
      setTimeout(() => {
        void this.connect();
      }, 5000);
    }
  }

  private async handleDelivery(msg: ConsumeMessage): Promise<void> {
    const ch = this.channel;
    if (!ch) {
      return;
    }

    let payload: AuditMessage;
    try {
      payload = JSON.parse(msg.content.toString()) as AuditMessage;
    } catch {
      this.logger.warn(
        'Mensagem de auditoria com JSON inválido; descartando (DLQ)',
      );
      ch.nack(msg, false, false);
      return;
    }

    try {
      this.logger.debug(`Audit recebido: ${payload.pattern}`);

      if (payload.pattern?.startsWith('audit.')) {
        await this.auditWorker.handleAuditEvent(payload);
      }

      ch.ack(msg);
    } catch (error) {
      const headers = (msg.properties.headers ?? {}) as Record<string, unknown>;
      const retry = Number(headers['x-audit-retry'] ?? 0);
      if (retry < AuditConsumerService.MAX_AUDIT_RETRIES) {
        const delayMs = Math.min(32_000, 1000 * 2 ** retry);
        this.logger.warn(
          `Falha ao persistir auditoria; retry ${retry + 1}/${AuditConsumerService.MAX_AUDIT_RETRIES} em ${delayMs}ms: ${error instanceof Error ? error.message : String(error)}`,
        );
        const timer = setTimeout(() => {
          this.retryTimers.delete(timer);
          const channel = this.channel;
          if (!channel) {
            this.logger.error(
              'Canal AMQP indisponível ao republicar mensagem de auditoria',
            );
            return;
          }
          try {
            channel.publish(
              'frame24-events',
              msg.fields.routingKey,
              msg.content,
              {
                persistent: msg.properties.deliveryMode === 2,
                contentType: msg.properties.contentType,
                headers: {
                  ...headers,
                  'x-audit-retry': retry + 1,
                },
              },
            );
          } catch (publishErr) {
            this.logger.error(
              `Erro ao republicar auditoria: ${publishErr instanceof Error ? publishErr.message : String(publishErr)}`,
            );
          }
        }, delayMs);
        this.retryTimers.add(timer);
        ch.ack(msg);
        return;
      }

      this.logger.error(
        `Falha ao persistir auditoria após ${AuditConsumerService.MAX_AUDIT_RETRIES} tentativas (DLQ): ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : '',
      );
      ch.nack(msg, false, false);
    }
  }

  private handleDisconnect() {
    this.connection = null;
    this.channel = null;
    if (!this.isConnecting) {
      setTimeout(() => {
        void this.connect();
      }, 5000);
    }
  }

  private async close() {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
    } catch {
      // ignore
    }
  }
}
