import type { ExportFormat } from "@/lib/exports/types";

export type ExportDocumentSection = {
  heading: string;
  lines: string[];
};

export type ExportDocument = {
  title: string;
  metadataLines: string[];
  sections: ExportDocumentSection[];
};

export type RenderedExport = {
  format: ExportFormat;
  bytes: Uint8Array;
};
