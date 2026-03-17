import "server-only";

import { createOpenAI } from "@ai-sdk/openai";

import { env } from "@/server/core/env";

let openaiProvider: ReturnType<typeof createOpenAI> | null = null;

export function getOpenAIProvider(): ReturnType<typeof createOpenAI> {
  if (!env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }

  if (!openaiProvider) {
    openaiProvider = createOpenAI({ apiKey: env.OPENAI_API_KEY });
  }

  return openaiProvider;
}
