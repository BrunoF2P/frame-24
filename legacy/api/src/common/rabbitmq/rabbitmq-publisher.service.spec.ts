import { RabbitMQPublisherService } from './rabbitmq-publisher.service';
import { connect } from 'amqplib';
import { LoggerService } from '../services/logger.service';
import { ClsService } from 'nestjs-cls';

jest.mock('amqplib', () => ({
  connect: jest.fn(),
}));

describe('RabbitMQPublisherService', () => {
  let service: RabbitMQPublisherService;
  let loggerService: jest.Mocked<LoggerService>;
  let cls: { get: jest.Mock };

  const buildChannel = () => ({
    on: jest.fn(),
    assertExchange: jest.fn().mockResolvedValue(undefined),
    publish: jest.fn().mockReturnValue(true),
    close: jest.fn().mockResolvedValue(undefined),
  });

  const buildConnection = (channel: ReturnType<typeof buildChannel>) => ({
    on: jest.fn(),
    createChannel: jest.fn().mockResolvedValue(channel),
    close: jest.fn().mockResolvedValue(undefined),
  });

  beforeEach(() => {
    loggerService = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;

    cls = {
      get: jest.fn((key: string) => {
        if (key === 'companyId') return 'company-1';
        if (key === 'userId') return 'user-1';
        return undefined;
      }),
    };

    service = new RabbitMQPublisherService(
      loggerService,
      cls as unknown as ClsService,
    );

    delete process.env.RABBITMQ_URI;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('connects and asserts exchange on module init using URI from env', async () => {
    const channel = buildChannel();
    const connection = buildConnection(channel);
    (connect as jest.Mock).mockResolvedValue(connection);
    process.env.RABBITMQ_URI = 'amqp://user:secret@localhost:5672';

    await service.onModuleInit();

    expect(connect).toHaveBeenCalledWith('amqp://user:secret@localhost:5672');
    expect(channel.assertExchange).toHaveBeenCalledWith(
      'frame24-events',
      'topic',
      {
        durable: true,
      },
    );
    expect(loggerService.log).toHaveBeenCalledWith(
      expect.stringContaining('amqp://user:***@localhost:5672'),
      'RabbitMQPublisher',
    );
  });

  it('builds URL from env vars when RABBITMQ_URI is absent', async () => {
    const channel = buildChannel();
    const connection = buildConnection(channel);
    (connect as jest.Mock).mockResolvedValue(connection);

    process.env.RABBITMQ_USER = 'user-x';
    process.env.RABBITMQ_PASSWORD = 'pass-x';
    process.env.RABBITMQ_HOST = 'rabbit-host';
    process.env.RABBITMQ_PORT = '5679';

    await service.onModuleInit();

    expect(connect).toHaveBeenCalledWith(
      'amqp://user-x:pass-x@rabbit-host:5679',
    );
    expect(loggerService.log).toHaveBeenCalledWith(
      expect.stringContaining('rabbit-host:5679'),
      'RabbitMQPublisher',
    );
  });

  it('returns early when connect is called while already connecting', async () => {
    (service as any).isConnecting = true;

    await (service as any).connect();

    expect(connect).not.toHaveBeenCalled();
  });

  it('publishes enriched message with CLS metadata when metadata is missing', async () => {
    const channel = buildChannel();
    (service as any).channel = channel;

    await service.publish({
      pattern: 'audit.test',
      data: { id: 1 },
    });

    expect(channel.publish).toHaveBeenCalledTimes(1);
    const args = channel.publish.mock.calls[0];
    expect(args[0]).toBe('frame24-events');
    expect(args[1]).toBe('audit.test');
    expect(args[3]).toEqual({ persistent: true });

    const payload = JSON.parse((args[2] as Buffer).toString());
    expect(payload.metadata.companyId).toBe('company-1');
    expect(payload.metadata.userId).toBe('user-1');
    expect(payload.metadata.timestamp).toBeDefined();
    expect(payload.metadata.correlationId).toEqual(expect.any(String));
  });

  it('keeps explicit metadata values and warns when publish buffer is full', async () => {
    const channel = buildChannel();
    channel.publish.mockReturnValue(false);
    (service as any).channel = channel;

    const explicitTime = new Date('2026-01-01T00:00:00.000Z');

    await service.publish({
      pattern: 'audit.test',
      data: { id: 2 },
      metadata: {
        companyId: 'company-explicit',
        userId: 'user-explicit',
        correlationId: 'corr-1',
        timestamp: explicitTime,
      },
    });

    const payload = JSON.parse(
      (channel.publish.mock.calls[0][2] as Buffer).toString(),
    );
    expect(payload.metadata).toMatchObject({
      companyId: 'company-explicit',
      userId: 'user-explicit',
      correlationId: 'corr-1',
      timestamp: explicitTime.toISOString(),
    });
    expect(loggerService.warn).toHaveBeenCalledWith(
      'Message buffer full, message may be lost',
      'RabbitMQPublisher',
    );
  });

  it('throws when channel is unavailable after reconnect attempt', async () => {
    (service as any).channel = null;
    const connectSpy = jest
      .spyOn(service as any, 'connect')
      .mockResolvedValue(undefined);

    await expect(
      service.publish({ pattern: 'audit.test', data: {} }),
    ).rejects.toThrow('RabbitMQ channel is not available');

    expect(connectSpy).toHaveBeenCalledTimes(1);
  });

  it('logs and rethrows errors during publish', async () => {
    const channel = buildChannel();
    channel.publish.mockImplementation(() => {
      throw new Error('publish failed');
    });
    (service as any).channel = channel;

    await expect(
      service.publish({ pattern: 'audit.test', data: {} }),
    ).rejects.toThrow('publish failed');

    expect(loggerService.error).toHaveBeenCalledWith(
      'Failed to publish message: publish failed',
      '',
      'RabbitMQPublisher',
    );
  });

  it('schedules reconnect with exponential backoff', async () => {
    jest.useFakeTimers();
    const connectSpy = jest
      .spyOn(service as any, 'connect')
      .mockResolvedValue(undefined);

    (service as any).scheduleReconnect();

    expect(loggerService.warn).toHaveBeenCalledWith(
      expect.stringContaining('5000ms (Attempt 1)'),
      'RabbitMQPublisher',
    );

    jest.advanceTimersByTime(5000);
    await Promise.resolve();

    expect(connectSpy).toHaveBeenCalledTimes(1);
  });

  it('handles disconnect events from connection and channel', async () => {
    const channel = buildChannel();
    const connection = buildConnection(channel);
    (connect as jest.Mock).mockResolvedValue(connection);

    await service.onModuleInit();

    const connectionOnCalls = connection.on.mock.calls;
    const onConnectionError = connectionOnCalls.find(
      (c) => c[0] === 'error',
    )?.[1];
    const onConnectionClose = connectionOnCalls.find(
      (c) => c[0] === 'close',
    )?.[1];

    const channelOnCalls = channel.on.mock.calls;
    const onChannelError = channelOnCalls.find((c) => c[0] === 'error')?.[1];
    const onChannelClose = channelOnCalls.find((c) => c[0] === 'close')?.[1];

    expect(onConnectionError).toBeDefined();
    expect(onConnectionClose).toBeDefined();
    expect(onChannelError).toBeDefined();
    expect(onChannelClose).toBeDefined();

    onConnectionError?.(new Error('conn boom'));
    onConnectionClose?.();
    onChannelError?.(new Error('channel boom'));
    onChannelClose?.();

    expect(loggerService.error).toHaveBeenCalledWith(
      expect.stringContaining('Connection error: conn boom'),
      '',
      'RabbitMQPublisher',
    );
    expect(loggerService.warn).toHaveBeenCalledWith(
      'Connection closed',
      'RabbitMQPublisher',
    );
    expect(loggerService.error).toHaveBeenCalledWith(
      expect.stringContaining('Channel error: channel boom'),
      '',
      'RabbitMQPublisher',
    );
    expect(loggerService.warn).toHaveBeenCalledWith(
      'Channel closed',
      'RabbitMQPublisher',
    );
  });

  it('schedules reconnect when connect fails', async () => {
    jest.useFakeTimers();
    (connect as jest.Mock).mockRejectedValue(new Error('cannot connect'));

    await service.onModuleInit();

    expect(loggerService.error).toHaveBeenCalledWith(
      'Failed to connect: cannot connect',
      '',
      'RabbitMQPublisher',
    );
    expect(loggerService.warn).toHaveBeenCalledWith(
      expect.stringContaining('Scheduling RabbitMQ reconnect in 5000ms'),
      'RabbitMQPublisher',
    );
  });

  it('does not schedule reconnect in handleDisconnect when already connecting', () => {
    const scheduleReconnectSpy = jest.spyOn(
      service as any,
      'scheduleReconnect',
    );
    (service as any).isConnecting = true;

    (service as any).handleDisconnect();

    expect(scheduleReconnectSpy).not.toHaveBeenCalled();
  });

  it('closes channel and connection on module destroy', async () => {
    const channel = buildChannel();
    const connection = buildConnection(channel);

    (service as any).channel = channel;
    (service as any).connection = connection;

    await service.onModuleDestroy();

    expect(channel.close).toHaveBeenCalledTimes(1);
    expect(connection.close).toHaveBeenCalledTimes(1);
  });
});
