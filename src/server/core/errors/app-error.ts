import "server-only";

export type AppErrorOptions = {
  code: string;
  userMessage: string;
  httpStatus?: number;
  retryable?: boolean;
  cause?: unknown;
};

export class AppError extends Error {
  readonly code: string;
  readonly userMessage: string;
  readonly httpStatus: number;
  readonly retryable: boolean;
  override readonly cause?: unknown;

  constructor(options: AppErrorOptions) {
    super(options.userMessage);
    this.name = "AppError";
    this.code = options.code;
    this.userMessage = options.userMessage;
    this.httpStatus = options.httpStatus ?? 400;
    this.retryable = options.retryable ?? false;
    this.cause = options.cause;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
