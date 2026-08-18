import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoggerService } from 'src/common/services/logger.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';

type JsonValue = string | number | boolean | JsonObject | JsonArray;
interface JsonObject {
  [key: string]: JsonValue;
}
type JsonArray = Array<JsonValue>;

interface AuditEventMetadata {
  userId?: string;
  companyId?: string;
  correlationId?: string;
  timestamp?: string;
}

interface AuditEventData {
  id?: string;
  old_values?: unknown;
  new_values?: unknown;
  [key: string]: unknown;
}

interface AuditEvent {
  pattern: string;
  data: AuditEventData;
  metadata?: AuditEventMetadata;
}

interface PatternParts {
  prefix: string;
  resource: string;
  action: string;
}

@Injectable()
export class AuditWorkerService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
    private snowflake: SnowflakeService,
  ) {}

  onModuleInit(): void {}

  async handleAuditEvent(message: AuditEvent): Promise<void> {
    this.validateMessage(message);
    const parts = this.parsePattern(message.pattern);
    const resourceId = this.getResourceId(message.data);

    const oldValues = this.extractOldValues(message.data);
    const newValues = this.extractNewValues(message.data);

    await this.saveToDatabase(message, parts, resourceId, oldValues, newValues);

    this.logger.log(
      `Audit saved: ${message.pattern} | ${parts.resource}:${resourceId}`,
      'AuditWorker',
    );
  }

  private validateMessage(message: AuditEvent): void {
    if (!message.data || !message.pattern) {
      throw new Error('Invalid audit event: missing data or pattern');
    }
  }

  private parsePattern(pattern: string): PatternParts {
    const parts = pattern.split('.');

    if (parts.length < 3 || parts[0] !== 'audit') {
      throw new Error(
        `Invalid pattern format: ${pattern}, expected audit.<resource>.<action>`,
      );
    }

    return {
      prefix: parts[0],
      resource: parts[1],
      action: parts[2],
    };
  }

  private getResourceId(data: AuditEventData): string {
    if (typeof data.id === 'string') {
      return data.id;
    }
    return 'unknown';
  }

  private extractOldValues(data: AuditEventData): JsonValue | undefined {
    if (this.isJsonValue(data.old_values)) {
      return data.old_values;
    }
    return undefined;
  }

  private extractNewValues(data: AuditEventData): JsonValue | undefined {
    if (this.isJsonValue(data.new_values)) {
      return data.new_values;
    }
    return undefined;
  }

  private isJsonValue(value: unknown): value is JsonValue {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return true;
    }

    if (Array.isArray(value)) {
      return value.every((item) => this.isJsonValue(item));
    }

    if (value !== null && typeof value === 'object') {
      return Object.values(value as Record<string, unknown>).every((item) =>
        this.isJsonValue(item),
      );
    }

    return false;
  }

  private async saveToDatabase(
    message: AuditEvent,
    parts: PatternParts,
    resourceId: string,
    oldValues: JsonValue | undefined,
    newValues: JsonValue | undefined,
  ): Promise<void> {
    await this.prisma.audit_logs.create({
      data: {
        id: this.snowflake.generate(),
        company_id: message.metadata?.companyId || '',
        event_type: message.pattern,
        resource_type: parts.resource,
        resource_id: resourceId,
        action: parts.action,
        user_id: message.metadata?.userId || undefined,
        correlation_id: message.metadata?.correlationId || undefined,
        old_values: oldValues,
        new_values: newValues,
      },
    });
  }
}
