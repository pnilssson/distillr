import "server-only";

import type { BillingState } from "@/lib/billing/types";
import type { ExportFormat } from "@/lib/exports/types";

export function canExportFormat(billingState: BillingState, format: ExportFormat): boolean {
  return billingState.allowedExportFormats.includes(format);
}
