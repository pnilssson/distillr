import "server-only";

import { NonRetriableError } from "inngest";

import { classifyIngestionError } from "@/server/ingestion/errors";

type InngestStepRunner = {
  run(id: string, fn: () => Promise<unknown>): Promise<unknown>;
};

export async function runIngestionStep<T>(
  step: InngestStepRunner,
  id: string,
  fn: () => Promise<T>,
): Promise<T> {
  const result = await step.run(id, async () => {
    try {
      return await fn();
    } catch (error) {
      const decision = classifyIngestionError(error);

      if (!decision.retryable) {
        throw new NonRetriableError(decision.reason, {
          cause: error instanceof Error ? error : undefined,
        });
      }

      throw error;
    }
  });

  return result as T;
}
