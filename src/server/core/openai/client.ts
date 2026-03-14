import "server-only";

import OpenAI from "openai";

import { env } from "@/server/core/env";

let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  return openaiClient;
}
