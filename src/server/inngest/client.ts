import "server-only";

import { EventSchemas, Inngest } from "inngest";

export const inngest = new Inngest({
  id: "distillr",
  schemas: new EventSchemas().fromRecord<{
    "source.added": {
      data: {
        userId: string;
        libraryId: string;
        sourceId: string;
      };
    };
    "video.ingest": {
      data: {
        userId: string;
        libraryId: string;
        sourceId: string;
        videoId: string;
        youtubeVideoId: string;
      };
    };
    "billing.usage.chat.record": {
      data: {
        userId: string;
        libraryId: string;
        sessionId: string;
        assistantMessageId: string;
        modelId: string;
        inputTokens: number;
        outputTokens: number;
        totalTokens?: number;
        cachedInputTokens?: number;
      };
    };
    "billing.usage.video.record": {
      data: {
        userId: string;
        libraryId: string;
        sourceId: string;
        videoId: string;
        units?: number;
      };
    };
    "billing.webhook.received": {
      data: {
        webhookId: string;
        eventType: string;
        payload: {
          type?: string;
          event?: string;
          name?: string;
          timestamp?: string;
          data?: Record<string, unknown>;
        };
      };
    };
  }>(),
});
