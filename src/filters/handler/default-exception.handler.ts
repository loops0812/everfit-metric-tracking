import { ExceptionHandler } from './interfaces/exception-handler.interface';
import { ResponseEntity } from 'src/commons/dto/api-response';
import { HttpStatus } from '@nestjs/common';

export class DefaultExceptionHandler implements ExceptionHandler {
  canHandle(): boolean {
    return true;
  }

  handle(): ResponseEntity<null> {
    return ResponseEntity.error(
      'Internal server error',
      HttpStatus.INTERNAL_SERVER_ERROR,
      {
        errorCode: 'INTERNAL_ERROR',
      },
    );
  }
}
