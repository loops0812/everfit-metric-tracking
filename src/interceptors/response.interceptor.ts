import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { randomUUID } from 'node:crypto';
import { Request, Response } from 'express';
import { ResponseEntity } from 'src/commons/dto/api-response';

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ResponseEntity<T>>
{
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

    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((data) => ({
        ...ResponseEntity.success<T>(
          data,
          'Request processed successfully',
          statusCode,
        ),
        requestId,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
