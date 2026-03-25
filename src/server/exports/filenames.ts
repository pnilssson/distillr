import "server-only";

import type { ExportFormat } from "@/lib/exports/types";

export function buildExportFilename(baseName: string, format: ExportFormat): string {
  const safeBase = sanitizeFilenamePart(baseName) || "distillr-export";
  return `${safeBase}.${format}`;
}

function sanitizeFilenamePart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}
