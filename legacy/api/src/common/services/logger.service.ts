import { Injectable, Logger as NestLogger } from '@nestjs/common';

type LogMetadata = Record<string, unknown>;

@Injectable()
export class LoggerService {
  private logger = new NestLogger();

  private serializeMetadata(metadata: LogMetadata): string {
    try {
      return JSON.stringify(metadata, null, 2);
    } catch {
      return '[unserializable metadata]';
    }
  }

  log(message: string, context?: string, metadata?: LogMetadata) {
    this.logger.log(message, context);
    if (metadata) {
      this.logger.log(this.serializeMetadata(metadata), context);
    }
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, trace || '', context);
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, context);
  }

  debug(message: string, context?: string, metadata?: LogMetadata) {
    this.logger.debug(message, context);
    if (metadata) {
      this.logger.debug(this.serializeMetadata(metadata), context);
    }
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, context);
  }
}
