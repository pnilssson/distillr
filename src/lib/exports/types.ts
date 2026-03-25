export const EXPORT_FORMATS = ["txt", "md", "pdf"] as const;
export const EXPORT_VARIANTS = ["raw", "smart"] as const;

export const SMART_EXPORT_CREDIT_COST = 3;

export type ExportFormat = (typeof EXPORT_FORMATS)[number];
export type ExportVariant = (typeof EXPORT_VARIANTS)[number];

export const EXPORT_MIME_TYPE_BY_FORMAT: Record<ExportFormat, string> = {
  txt: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  pdf: "application/pdf",
};
