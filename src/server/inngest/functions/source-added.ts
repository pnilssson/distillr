import "server-only";

import * as Sentry from "@sentry/nextjs";
import { and, eq, sql } from "drizzle-orm";
import { NonRetriableError } from "inngest";

import { db } from "@/db";
import { sources } from "@/db/schema";
import { classifyIngestionError } from "@/server/ingestion/errors";
import { planAndQueueSourceItems, sendVideoIngestEvents } from "@/server/ingestion/source-planner";
import { getDiscovery } from "@/server/ingestion/providers/registry";
import { isSourceType } from "@/server/ingestion/providers/types";
import { inngest } from "@/server/inngest/client";
import { runIngestionStep } from "@/server/inngest/ingestion-step";
import { shouldStopRetrying } from "@/server/inngest/retry-policy";

export const sourceAdded = inngest.createFunction(
  {
    id: "source-added",
    retries: 3,
    concurrency: {
      limit: 1,
      key: "event.data.userId",
    },
  },
  { event: "source.added" },
  async ({ event, step, attempt, maxAttempts }) => {
    const failureContext = {
      userId: event.data.userId,
      libraryId: event.data.libraryId,
      sourceId: event.data.sourceId,
    };

    try {
      const source = await step.run("load-source", async () => {
        const [row] = await db
          .select({
            id: sources.id,
            userId: sources.userId,
            libraryId: sources.libraryId,
            sourceType: sources.sourceType,
            url: sources.url,
          })
          .from(sources)
          .where(
            and(
              eq(sources.id, event.data.sourceId),
              eq(sources.userId, event.data.userId),
              eq(sources.libraryId, event.data.libraryId),
            ),
          );

        if (!row) {
          throw new NonRetriableError("Source not found for source.added event.");
        }

        return row;
      });

      failureContext.userId = source.userId;
      failureContext.libraryId = source.libraryId;
      failureContext.sourceId = source.id;

      if (!isSourceType(source.sourceType)) {
        throw new NonRetriableError(`Unsupported source type: ${source.sourceType}`);
      }

      const sourceType = source.sourceType;

      await step.run("mark-source-processing", async () => {
        await db
          .update(sources)
          .set({
            status: "processing",
            updatedAt: sql`now()`,
          })
          .where(
            and(
              eq(sources.id, source.id),
              eq(sources.userId, source.userId),
              eq(sources.libraryId, source.libraryId),
            ),
          );
      });

      const discoveryResult = await runIngestionStep(step, "discover-source-items", async () => {
        const discovery = getDiscovery(sourceType);
        return discovery.discover(source.url, sourceType);
      });

      const discoveredItems = discoveryResult.items;

      await step.run("update-source-metadata", async () => {
        await db
          .update(sources)
          .set({
            channelName: discoveryResult.sourceAuthorName,
            title: discoveryResult.sourceTitle,
            updatedAt: sql`now()`,
          })
          .where(
            and(
              eq(sources.id, source.id),
              eq(sources.userId, source.userId),
              eq(sources.libraryId, source.libraryId),
            ),
          );
      });

      if (discoveredItems.length === 0) {
        await step.run("mark-source-ready-no-items", async () => {
          await db
            .update(sources)
            .set({
              status: "ready",
              updatedAt: sql`now()`,
            })
            .where(
              and(
                eq(sources.id, source.id),
                eq(sources.userId, source.userId),
                eq(sources.libraryId, source.libraryId),
              ),
            );
        });

        return {
          sourceId: source.id,
          discovered: 0,
          queued: 0,
          deferred: 0,
        };
      }

      const queuePlan = await step.run("plan-source-queue", async () => {
        return planAndQueueSourceItems(source, discoveredItems);
      });

      await sendVideoIngestEvents(source, queuePlan.rowsToQueue, (batchId, events) => {
        return step.sendEvent(`enqueue-video-ingest-${batchId}`, events);
      });

      await step.run("mark-source-ready", async () => {
        await db
          .update(sources)
          .set({
            status: "ready",
            updatedAt: sql`now()`,
          })
          .where(
            and(
              eq(sources.id, source.id),
              eq(sources.userId, source.userId),
              eq(sources.libraryId, source.libraryId),
            ),
          );
      });

      return {
        sourceId: source.id,
        discovered: queuePlan.dedupedCount,
        queued: queuePlan.queuedCount,
        deferred: queuePlan.deferredCount,
      };
    } catch (error) {
      const decision = classifyIngestionError(error);
      const stopRetrying = shouldStopRetrying({
        retryable: decision.retryable,
        attempt,
        maxAttempts,
      });

      await step.run("mark-source-failed", async () => {
        await db
          .update(sources)
          .set({
            status: "failed",
            updatedAt: sql`now()`,
          })
          .where(
            and(
              eq(sources.id, failureContext.sourceId),
              eq(sources.userId, failureContext.userId),
              eq(sources.libraryId, failureContext.libraryId),
            ),
          );
      });

      if (decision.captureException) {
        Sentry.captureException(error);
      }

      if (stopRetrying) {
        return {
          sourceId: failureContext.sourceId,
          status: "failed",
          reason: decision.reason,
        };
      }

      throw error;
    }
  },
);
