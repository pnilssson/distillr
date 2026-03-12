import "server-only";

const DEFAULT_MAX_ATTEMPTS = 3;

type RetryPolicyInput = {
  retryable: boolean;
  attempt: number;
  maxAttempts?: number;
};

export function isFinalAttempt(attempt: number, maxAttempts?: number): boolean {
  const totalAttempts = maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  return attempt >= totalAttempts - 1;
}

export function shouldStopRetrying({ retryable, attempt, maxAttempts }: RetryPolicyInput): boolean {
  if (!retryable) {
    return true;
  }

  return isFinalAttempt(attempt, maxAttempts);
}
