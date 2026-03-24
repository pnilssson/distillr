import "server-only";

export const MONTHLY_INGESTION_LIMIT_REACHED_REASON = "Monthly ingestion limit reached.";
export const PLAN_VIDEO_LIMIT_REACHED_REASON = "Plan video limit reached.";

export function isMonthlyIngestionLimitReason(reason: string | null | undefined): boolean {
  if (!reason) {
    return false;
  }

  const normalized = reason.toLowerCase();

  return (
    normalized.includes("monthly ingestion limit reached") ||
    normalized.includes("monthly video ingestion limit")
  );
}

export function isPlanVideoLimitReason(reason: string | null | undefined): boolean {
  if (!reason) {
    return false;
  }

  const normalized = reason.toLowerCase();

  return (
    normalized.includes("plan video limit reached") ||
    normalized.includes("total video limit") ||
    normalized.includes("video ingestion limit for this plan")
  );
}
