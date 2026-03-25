import "server-only";

import { EXPORT_MIME_TYPE_BY_FORMAT, type ExportFormat } from "@/lib/exports/types";

type BuildExportResponseInput = {
  bytes: Uint8Array;
  filename: string;
  format: ExportFormat;
};

export function buildExportResponse(input: BuildExportResponseInput): Response {
  return new Response(Buffer.from(input.bytes), {
    status: 200,
    headers: {
      "Content-Type": EXPORT_MIME_TYPE_BY_FORMAT[input.format],
      "Content-Disposition": `attachment; filename="${input.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
