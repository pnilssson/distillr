import "server-only";

import type { ExportFormat } from "@/lib/exports/types";
import type { ExportDocument } from "@/server/exports/types";
import { renderExportDocumentAsMarkdown } from "@/server/exports/renderers/markdown";
import { renderExportDocumentAsPdf } from "@/server/exports/renderers/pdf";
import { renderExportDocumentAsTxt } from "@/server/exports/renderers/txt";

export async function renderExportDocument(
  format: ExportFormat,
  document: ExportDocument,
): Promise<Uint8Array> {
  if (format === "txt") {
    return renderExportDocumentAsTxt(document);
  }

  if (format === "md") {
    return renderExportDocumentAsMarkdown(document);
  }

  return renderExportDocumentAsPdf(document);
}
