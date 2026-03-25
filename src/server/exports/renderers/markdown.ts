import "server-only";

import { TextEncoder } from "node:util";

import type { ExportDocument } from "@/server/exports/types";

const encoder = new TextEncoder();

export function renderExportDocumentAsMarkdown(document: ExportDocument): Uint8Array {
  const lines: string[] = [`# ${document.title}`, ""];

  if (document.metadataLines.length > 0) {
    lines.push("## Metadata");
    lines.push("");

    for (const line of document.metadataLines) {
      lines.push(`- ${line}`);
    }

    lines.push("");
  }

  for (const section of document.sections) {
    lines.push(`## ${section.heading}`);
    lines.push("");

    for (const line of section.lines) {
      lines.push(line);
    }

    lines.push("");
  }

  return encoder.encode(lines.join("\n").trimEnd() + "\n");
}
