import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Request, Response } from 'express';
import {
  DefaultExceptionHandler,
  ExceptionHandler,
  HttpExceptionHandler,
} from './handler';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  private readonly handlers: ExceptionHandler[] = [
    new HttpExceptionHandler(),
    new DefaultExceptionHandler(),
  ];

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const requestId =
      (request.headers['x-request-id'] as string) || randomUUID();

    response.setHeader('X-Request-Id', requestId);

    const handler = this.handlers.find((h) => h.canHandle(exception))!;
    const body = handler.handle(exception);

    this.logException(exception, requestId, request);

    response.status(body.statusCode).json({
      ...body,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }

  private logException(
    exception: unknown,
    requestId: string,
    request: Request,
  ): void {
    const context = `${request.method} ${request.url}`;

    if (exception instanceof HttpException && exception.getStatus() < 500) {
      this.logger.warn(`[${requestId}] ${context} - ${exception.message}`);
    } else {
      this.logger.error(
        `[${requestId}] ${context} - ${exception instanceof Error ? exception.stack : JSON.stringify(exception)}`,
      );
    }
  }
}
