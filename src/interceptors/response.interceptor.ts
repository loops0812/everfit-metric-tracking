import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map, tap } from 'rxjs';
import { randomUUID } from 'node:crypto';
import { Request, Response } from 'express';
import { ResponseEntity } from 'src/commons/dto/api-response';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ResponseEntity<T>
> {
  private readonly logger = new Logger(ResponseInterceptor.name);

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ResponseEntity<T>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const requestId =
      (request.headers['x-request-id'] as string) || randomUUID();

    response.setHeader('X-Request-Id', requestId);

    const { method, originalUrl } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      map((data) => ({
        ...ResponseEntity.success<T>(
          data,
          'Request processed successfully',
          response.statusCode,
        ),
        requestId,
        timestamp: new Date().toISOString(),
      })),
      tap(() => {
        const duration = Date.now() - startTime;
        this.logger.log(
          `${method} ${originalUrl} ${response.statusCode} - ${duration}ms [${requestId}]`,
        );
      }),
    );
  }
}
