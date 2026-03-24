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
  readonly timestamp: string;
  readonly requestId?: string;
  readonly errorCode?: string;

  private constructor(
    statusCode: number,
    message: string,
    data: T,
    options?: { violations?: Violation[]; requestId?: string; errorCode?: string },
  ) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.timestamp = new Date().toISOString();

    if (options?.errorCode) {
      this.errorCode = options.errorCode;
    }
    if (options?.violations) {
      this.violations = options.violations;
    }
    if (options?.requestId) {
      this.requestId = options.requestId;
    }
  }

  static success<T>(
    data: T,
    message: string = 'Success',
    statusCode = 200,
    requestId?: string,
    errorCode?: string,
  ): ResponseEntity<T> {
    return new ResponseEntity(statusCode, message, data, { requestId, errorCode });
  }

  static error<T = null>(
    message: string,
    statusCode: number,
    violations?: Violation[],
    requestId?: string,
    errorCode?: string,
  ): ResponseEntity<T> {
    return new ResponseEntity(statusCode, message, null as T, {
      violations,
      requestId,
      errorCode,
    });
  }
}
