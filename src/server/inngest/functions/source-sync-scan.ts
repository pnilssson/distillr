import "server-only";

import { inngest } from "@/server/inngest/client";
import { getDueAutoSyncSources } from "@/server/sources/queries";

const AUTO_SYNC_SCAN_LIMIT = 1000;
const AUTO_SYNC_EVENT_BATCH_SIZE = 100;

export const sourceSyncScan = inngest.createFunction(
  {
    id: "source-sync-scan",
    retries: 1,
  },
  { cron: "0 * * * *" },
  async ({ step }) => {
    const dueSources = await step.run("load-due-auto-sync-sources", async () => {
      return getDueAutoSyncSources(AUTO_SYNC_SCAN_LIMIT);
    });

    if (dueSources.length === 0) {
      return {
        queued: 0,
      };
    }

    for (let i = 0; i < dueSources.length; i += AUTO_SYNC_EVENT_BATCH_SIZE) {
      const batch = dueSources.slice(i, i + AUTO_SYNC_EVENT_BATCH_SIZE);
      const batchId = i / AUTO_SYNC_EVENT_BATCH_SIZE;

      await step.sendEvent(
        `enqueue-source-sync-${batchId}`,
        batch.map((source) => ({
          name: "source.sync.requested" as const,
          data: {
            userId: source.userId,
            libraryId: source.libraryId,
            sourceId: source.id,
          },
        })),
      );
    }

    return {
      queued: dueSources.length,
    };
  },
);
