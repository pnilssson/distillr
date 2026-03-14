import "server-only";

import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    OPENAI_API_KEY: z.string().min(1).optional(),
    OPENAI_MODEL_EMBEDDING: z.string().min(1).optional(),
    OPENAI_MODEL_INGESTION: z.string().min(1).optional(),
    OPENAI_MODEL_CHAT_FAST: z.string().min(1).optional(),
    OPENAI_MODEL_CHAT_SMART: z.string().min(1).optional(),
    OPENAI_CHAT_DEFAULT_TIER: z.enum(["fast", "smart"]).optional(),
    OPENAI_CHAT_MAX_OUTPUT_TOKENS_FAST: z.coerce.number().int().min(1),
    OPENAI_CHAT_MAX_OUTPUT_TOKENS_SMART: z.coerce.number().int().min(1),
    TRANSCRIPTAPI_API_KEY: z.string().min(1).optional(),
    YOUTUBE_DATA_API_KEY: z.string().min(1).optional(),
    INNGEST_EVENT_KEY: z.string().min(1).optional(),
    INNGEST_SIGNING_KEY: z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().optional(),
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.url().optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL_EMBEDDING: process.env.OPENAI_MODEL_EMBEDDING,
    OPENAI_MODEL_INGESTION: process.env.OPENAI_MODEL_INGESTION,
    OPENAI_MODEL_CHAT_FAST: process.env.OPENAI_MODEL_CHAT_FAST,
    OPENAI_MODEL_CHAT_SMART: process.env.OPENAI_MODEL_CHAT_SMART,
    OPENAI_CHAT_DEFAULT_TIER: process.env.OPENAI_CHAT_DEFAULT_TIER,
    OPENAI_CHAT_MAX_OUTPUT_TOKENS_FAST: process.env.OPENAI_CHAT_MAX_OUTPUT_TOKENS_FAST,
    OPENAI_CHAT_MAX_OUTPUT_TOKENS_SMART: process.env.OPENAI_CHAT_MAX_OUTPUT_TOKENS_SMART,
    TRANSCRIPTAPI_API_KEY: process.env.TRANSCRIPTAPI_API_KEY,
    YOUTUBE_DATA_API_KEY: process.env.YOUTUBE_DATA_API_KEY,
    INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,
    INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  },
  emptyStringAsUndefined: true,
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
});
