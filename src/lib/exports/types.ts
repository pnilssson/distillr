export const EXPORT_FORMATS = ["txt", "md", "pdf"] as const;

export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const EXPORT_MIME_TYPE_BY_FORMAT: Record<ExportFormat, string> = {
  txt: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  pdf: "application/pdf",
};
