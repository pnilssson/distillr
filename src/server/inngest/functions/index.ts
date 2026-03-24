import {
  billingUsageChatRecord,
  billingUsageReconcile,
  billingUsageVideoRecord,
} from "@/server/inngest/functions/billing-usage";
import { billingWebhookReceived } from "@/server/inngest/functions/billing-webhooks";
import { sourceAdded } from "@/server/inngest/functions/source-added";
import { sourceSync } from "@/server/inngest/functions/source-sync";
import { sourceSyncScan } from "@/server/inngest/functions/source-sync-scan";
import { videoIngest } from "@/server/inngest/functions/video-ingest";

export const inngestFunctions = [
  billingUsageChatRecord,
  billingUsageVideoRecord,
  billingUsageReconcile,
  billingWebhookReceived,
  sourceAdded,
  sourceSync,
  sourceSyncScan,
  videoIngest,
];
