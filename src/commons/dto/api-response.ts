export interface Violation {
  property: string;
  constraints: Record<string, string>;
  children?: Violation[];
}

export class ResponseEntity<T = unknown> {
  readonly statusCode: number;
  readonly message: string;
  readonly data: T;
  readonly violations?: Violation[];
  readonly errorCode?: string;

  private constructor(
    statusCode: number,
    message: string,
    data: T,
    options?: { violations?: Violation[]; errorCode?: string },
  ) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;

    if (options?.errorCode) {
      this.errorCode = options.errorCode;
    }
    if (options?.violations) {
      this.violations = options.violations;
    }
  }

  static success<T>(
    data: T,
    message: string = 'Success',
    statusCode = 200,
  ): ResponseEntity<T> {
    return new ResponseEntity(statusCode, message, data);
  }

  static error<T = null>(
    message: string,
    statusCode: number,
    options?: { violations?: Violation[]; errorCode?: string },
  ): ResponseEntity<T> {
    return new ResponseEntity(statusCode, message, null as T, options);
  }
}
