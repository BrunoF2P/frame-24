import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';

interface ErrorResponse {
  success: false;
  statusCode: number;
  code: string;
  timestamp: string;
  path: string;
  method: string;
  traceId: string;
  message: string | string[];
  errors?: unknown;
  error?: unknown;
}

interface ValidationIssueLike {
  path?: unknown;
  message?: unknown;
}

function headerToString(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length > 0) return value[0];
  return undefined;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  private formatValidationErrors(errors: unknown): string | undefined {
    if (!Array.isArray(errors)) {
      return undefined;
    }

    const parsed = errors
      .map((issue) => {
        const entry = issue as ValidationIssueLike;
        const path = Array.isArray(entry.path)
          ? entry.path.filter((part) => typeof part === 'string').join('.')
          : 'unknown';
        const message =
          typeof entry.message === 'string' ? entry.message : 'invalid value';

        return `${path}: ${message}`;
      })
      .filter((line) => line.trim().length > 0);

    if (parsed.length === 0) {
      return undefined;
    }

    return parsed.join(' | ');
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const responseLocals = response.locals as
      | { requestId?: unknown }
      | undefined;
    const responseRequestId =
      typeof responseLocals?.requestId === 'string'
        ? responseLocals.requestId
        : undefined;
    const requestIdHeader = headerToString(request.headers['x-request-id']);
    const correlationIdHeader = headerToString(
      request.headers['x-correlation-id'],
    );
    const traceId =
      responseRequestId ??
      requestIdHeader ??
      correlationIdHeader ??
      randomUUID();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let code = 'INTERNAL_SERVER_ERROR';
    let validationErrors: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const payload = exception.getResponse();

      if (typeof payload === 'string') {
        message = payload;
      } else if (payload && typeof payload === 'object') {
        const record = payload as Record<string, unknown>;
        const payloadMessage = record.message;
        const payloadCode = record.error;

        if (
          typeof payloadMessage === 'string' ||
          Array.isArray(payloadMessage)
        ) {
          message = payloadMessage as string | string[];
        }

        if (typeof payloadCode === 'string' && payloadCode.trim().length > 0) {
          code = payloadCode
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, '_');
        }

        if ('errors' in record) {
          validationErrors = record['errors'];
        }
      }

      if (code === 'INTERNAL_SERVER_ERROR') {
        code = HttpStatus[status] || 'HTTP_ERROR';
      }
    }

    this.logger.error(
      `${request.method} ${request.url} - ${status} [traceId=${traceId}]`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    if (status === HttpStatus.BAD_REQUEST && validationErrors !== undefined) {
      const details = this.formatValidationErrors(validationErrors);
      if (details) {
        this.logger.warn(`Validation details [traceId=${traceId}]: ${details}`);
      }
    }

    const errorResponse: ErrorResponse = {
      success: false,
      statusCode: status,
      code,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      traceId,
      message,
      ...(validationErrors !== undefined && { errors: validationErrors }),
      ...(process.env.NODE_ENV === 'development' && {
        error:
          exception instanceof Error
            ? {
                name: exception.name,
                message: exception.message,
                stack: exception.stack,
              }
            : String(exception),
      }),
    };

    response.setHeader('x-request-id', traceId);
    response.setHeader('x-trace-id', traceId);
    response.status(status).json(errorResponse);
  }
}
