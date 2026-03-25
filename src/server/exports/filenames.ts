import "server-only";

import type { ExportFormat, ExportVariant } from "@/lib/exports/types";

export function buildExportFilename(
  baseName: string,
  format: ExportFormat,
  variant: ExportVariant,
): string {
  const safeBase = sanitizeFilenamePart(baseName) || "distillr-export";
  const suffix = variant === "smart" ? "smart-export" : "raw-export";
  return `${safeBase}-${suffix}.${format}`;
}

function sanitizeFilenamePart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}
