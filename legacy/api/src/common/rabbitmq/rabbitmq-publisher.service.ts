import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Channel, ChannelModel, connect } from 'amqplib';
import { LoggerService } from '../services/logger.service';
import { requireEnv } from 'src/config/env.util';
import { ClsService } from 'nestjs-cls';

export interface RabbitMQMessage<T = unknown> {
  pattern: string;
  data: T;
  metadata?: {
    userId?: string;
    companyId?: string;
    timestamp?: Date;
    correlationId?: string;
  };
}

@Injectable()
export class RabbitMQPublisherService implements OnModuleInit, OnModuleDestroy {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private readonly logger = 'RabbitMQPublisher';
  private isConnecting = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectDelay = 60000;
  private readonly baseReconnectDelay = 5000;

  constructor(
    private loggerService: LoggerService,
    private readonly cls: ClsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }

  private async connect(): Promise<void> {
    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      const uri = process.env.RABBITMQ_URI;
      let url: string;
      let logInfo: string;

      if (uri) {
        url = uri;
        // Mask password in logs
        logInfo = uri.replace(/:([^:@]+)@/, ':***@');
      } else {
        const user = requireEnv('RABBITMQ_USER', 'test');
        const password = requireEnv('RABBITMQ_PASSWORD', 'test');
        const host = requireEnv('RABBITMQ_HOST', 'localhost');
        const port = requireEnv('RABBITMQ_PORT', '5672');
        url = `amqp://${user}:${password}@${host}:${port}`;
        logInfo = `${host}:${port}`;
      }

      this.loggerService.log(
        `Connecting to RabbitMQ at ${logInfo}...`,
        this.logger,
      );

      this.connection = await connect(url);

      this.connection.on('error', (err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        this.loggerService.error(
          `Connection error: ${message}`,
          '',
          this.logger,
        );
        this.handleDisconnect();
      });

      this.connection.on('close', () => {
        this.loggerService.warn('Connection closed', this.logger);
        this.handleDisconnect();
      });

      this.channel = await this.connection.createChannel();

      this.channel.on('error', (err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        this.loggerService.error(`Channel error: ${message}`, '', this.logger);
      });

      this.channel.on('close', () => {
        this.loggerService.warn('Channel closed', this.logger);
        this.channel = null;
      });

      await this.channel.assertExchange('frame24-events', 'topic', {
        durable: true,
      });

      this.loggerService.log('Connected to RabbitMQ successfully', this.logger);
      this.isConnecting = false;
      this.reconnectAttempts = 0; // Reset backoff counter on success
    } catch (error) {
      this.isConnecting = false;
      this.loggerService.error(
        `Failed to connect: ${(error as Error).message}`,
        '',
        this.logger,
      );
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay,
    );
    this.loggerService.warn(
      `Scheduling RabbitMQ reconnect in ${delay}ms (Attempt ${this.reconnectAttempts + 1})...`,
      this.logger,
    );
    this.reconnectAttempts++;
    setTimeout(() => {
      void this.connect();
    }, delay);
  }

  private handleDisconnect() {
    this.connection = null;
    this.channel = null;
    if (!this.isConnecting) {
      this.scheduleReconnect();
    }
  }

  private async close() {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
    } catch {
      // Ignore errors during close
    }
  }

  async publish<T = unknown>(message: RabbitMQMessage<T>): Promise<void> {
    if (!this.channel) {
      this.loggerService.warn(
        'Channel not ready, attempting to reconnect...',
        this.logger,
      );
      await this.connect();
      if (!this.channel) {
        throw new Error('RabbitMQ channel is not available');
      }
    }

    const contextCompanyId = this.cls.get<string>('companyId');
    const contextUserId = this.cls.get<string>('userId');

    const metadata = message.metadata ?? {};

    const enrichedMessage = {
      ...message,
      metadata: {
        ...metadata,
        companyId: metadata.companyId ?? contextCompanyId,
        userId: metadata.userId ?? contextUserId,
        timestamp: metadata.timestamp ?? new Date(),
        correlationId: metadata.correlationId ?? this.generateCorrelationId(),
      },
    };

    try {
      const result = this.channel.publish(
        'frame24-events',
        message.pattern,
        Buffer.from(JSON.stringify(enrichedMessage)),
        { persistent: true },
      );

      if (!result) {
        this.loggerService.warn(
          'Message buffer full, message may be lost',
          this.logger,
        );
      }
    } catch (error) {
      this.loggerService.error(
        `Failed to publish message: ${(error as Error).message}`,
        '',
        this.logger,
      );
      throw error;
    }
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
