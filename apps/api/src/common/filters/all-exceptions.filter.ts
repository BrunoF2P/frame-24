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
  error?: unknown;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const traceId =
      response.locals?.requestId ??
      request.headers['x-request-id']?.toString() ??
      request.headers['x-correlation-id']?.toString() ??
      randomUUID();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let code = 'INTERNAL_SERVER_ERROR';

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
      }

      if (code === 'INTERNAL_SERVER_ERROR') {
        code = HttpStatus[status] || 'HTTP_ERROR';
      }
    }

    this.logger.error(
      `${request.method} ${request.url} - ${status} [traceId=${traceId}]`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    const errorResponse: ErrorResponse = {
      success: false,
      statusCode: status,
      code,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      traceId,
      message,
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
