import { ResponseEntity } from 'src/commons/dto/api-response';

export interface ExceptionHandler {
  canHandle(exception: unknown): boolean;
  handle(exception: unknown): ResponseEntity;
}
