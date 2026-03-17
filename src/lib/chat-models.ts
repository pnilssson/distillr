/**
 * Single source of truth for chat model options exposed to users.
 *
 * To add a new model:
 *   1. Add its alias to `ModelAlias` and its config to the catalog in
 *      src/server/core/ai/models.ts.
 *   2. Add an entry to CHAT_MODEL_OPTIONS below.
 *
 * Everything else (types, validation, UI) derives from this array automatically.
 */

export const CHAT_MODEL_OPTIONS = [
  { id: "chat.fast", label: "Nano" },
  { id: "chat.smart", label: "Mini" },
  { id: "chat.pro", label: "Smart" },
] as const satisfies { id: string; label: string }[];

export const CHAT_MODEL_IDS = CHAT_MODEL_OPTIONS.map((o) => o.id) as [
  (typeof CHAT_MODEL_OPTIONS)[number]["id"],
  ...(typeof CHAT_MODEL_OPTIONS)[number]["id"][],
];

export type ChatModelId = (typeof CHAT_MODEL_OPTIONS)[number]["id"];

export const DEFAULT_CHAT_MODEL_ID: ChatModelId = "chat.smart";
