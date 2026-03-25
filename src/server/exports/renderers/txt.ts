import "server-only";

import { TextEncoder } from "node:util";

import type { ExportDocument } from "@/server/exports/types";

const encoder = new TextEncoder();

export function renderExportDocumentAsTxt(document: ExportDocument): Uint8Array {
  const lines: string[] = [document.title, ""];

  if (document.metadataLines.length > 0) {
    lines.push("Metadata");
    lines.push(...document.metadataLines);
    lines.push("");
  }

  for (const section of document.sections) {
    lines.push(section.heading);
    lines.push(...section.lines);
    lines.push("");
  }

  return encoder.encode(lines.join("\n").trimEnd() + "\n");
}
