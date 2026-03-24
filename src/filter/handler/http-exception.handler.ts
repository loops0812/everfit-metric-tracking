import { HttpException, HttpStatus } from '@nestjs/common';
import { ExceptionHandler } from './interfaces/exception-handler.interface';
import { ResponseEntity, Violation } from 'src/commons/dto/api-response';

const ERROR_CODE_MAP: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
  [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
};

export class HttpExceptionHandler implements ExceptionHandler {
  canHandle(exception: unknown): boolean {
    return exception instanceof HttpException;
  }

  handle(exception: unknown): ResponseEntity {
    const httpException = exception as HttpException;
    const statusCode = httpException.getStatus();
    const response = httpException.getResponse();
    const errorCode = ERROR_CODE_MAP[statusCode] ?? 'HTTP_ERROR';

    const violations = this.extractViolations(response);

    if (violations) {
      return ResponseEntity.error('Validation failed', statusCode, {
        violations,
        errorCode: 'VALIDATION_ERROR',
      });
    }

    const message =
      typeof response === 'string'
        ? response
        : (response as Record<string, unknown>).message as string ?? httpException.message;

    return ResponseEntity.error(message, statusCode, { errorCode });
  }

  /**
   * NestJS ValidationPipe throws BadRequestException with response:
   * { message: string[], error: 'Bad Request', statusCode: 400 }
   * We convert the message[] into Violation[] for structured error output.
   */
  private extractViolations(
    response: string | object,
  ): Violation[] | undefined {
    if (typeof response !== 'object' || response === null) return undefined;

    const res = response as Record<string, unknown>;
    const messages = res.message;

    if (!Array.isArray(messages) || messages.length === 0) return undefined;
    if (typeof messages[0] !== 'string') return undefined;

    return messages.map((msg: string) => ({
      property: this.extractProperty(msg),
      constraints: { validation: msg },
    }));
  }

  private extractProperty(message: string): string {
    const match = message.match(/^(\w+)\s/);
    return match ? match[1] : 'unknown';
  }
}
