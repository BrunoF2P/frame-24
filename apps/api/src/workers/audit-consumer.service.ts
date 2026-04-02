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

  constructor(private auditWorker: AuditWorkerService) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Starting consumer...');
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }

  private async connect(): Promise<void> {
    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      const user = requireEnv('RABBITMQ_USER', 'test');
      const password = requireEnv('RABBITMQ_PASSWORD', 'test');
      const host = requireEnv('RABBITMQ_HOST', 'localhost');
      const port = requireEnv('RABBITMQ_PORT', '5672');
      const url = `amqp://${user}:${password}@${host}:${port}`;

      this.connection = await connect(url);

      this.connection.on('error', (err: unknown) => {
        this.logger.error(
          `Connection error: ${err instanceof Error ? err.message : String(err)}`,
        );
        this.handleDisconnect();
      });

      this.connection.on('close', () => {
        this.logger.warn('Connection closed');
        this.handleDisconnect();
      });

      this.channel = await this.connection.createChannel();

      this.channel.on('error', (err: unknown) => {
        this.logger.error(
          `Channel error: ${err instanceof Error ? err.message : String(err)}`,
        );
      });

      this.channel.on('close', () => {
        this.logger.warn('Channel closed');
        this.channel = null;
      });

      await this.channel.assertExchange('frame24-events', 'topic', {
        durable: true,
      });

      await this.channel.assertQueue('audit-queue', { durable: true });

      await this.channel.bindQueue('audit-queue', 'frame24-events', 'audit.#');
      this.logger.log('Connected! Listening to queue...');

      await this.channel.consume(
        'audit-queue',
        (msg: ConsumeMessage | null) => {
          if (!msg) return;

          void this.processMessage(msg).catch((error) => {
            this.logger.error(
              `Error processing message: ${error instanceof Error ? error.message : 'Unknown'}`,
              error instanceof Error ? error.stack : '',
            );
            // Requeue the message if processing failed, but be careful about infinite loops
            // For now, we nack without requeue to avoid blocking, or we could implement a dead letter queue
            this.channel?.nack(msg, false, false);
          });
        },
      );
      this.isConnecting = false;
    } catch (error) {
      this.isConnecting = false;
      this.logger.error(
        `Connection failed: ${error instanceof Error ? error.message : String(error)}`,
      );

      setTimeout(() => {
        this.connect().catch((err) => {
          this.logger.error(
            'Reconnect failed',
            err instanceof Error ? err.stack : '',
          );
        });
      }, 5000);
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
      // Ignore errors
    }
  }

  private async processMessage(msg: ConsumeMessage): Promise<void> {
    try {
      const content = JSON.parse(msg.content.toString()) as AuditMessage;
      this.logger.debug(`Received: ${content.pattern}`);

      if (content.pattern?.startsWith('audit.')) {
        await this.auditWorker.handleAuditEvent(content);
        this.logger.debug(`Processed: ${content.pattern}`);
      }

      this.channel?.ack(msg);
    } catch (error) {
      this.logger.error(
        `Failed to parse or process message: ${error instanceof Error ? error.message : String(error)}`,
      );
      // If JSON parse fails, we should probably ack or nack without requeue as it will never succeed
      this.channel?.nack(msg, false, false);
    }
  }
}
