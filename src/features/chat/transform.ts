import type { UIMessage } from "ai";

import type { ChatMessageItem, ChatMessageMetadata } from "@/features/chat/types";

export function toUIMessages(dbMessages: ChatMessageItem[]): UIMessage<ChatMessageMetadata>[] {
  return dbMessages.map((message) => ({
    id: message.id,
    role: message.role,
    parts: [
      {
        type: "text",
        text: message.content,
      },
    ],
    metadata:
      message.sources || message.status === "aborted" || message.effectiveMode
        ? {
            sources: message.sources ?? undefined,
            status: message.status,
            effectiveMode: message.effectiveMode ?? undefined,
          }
        : undefined,
  }));
}
