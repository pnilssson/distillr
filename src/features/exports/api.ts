import type { ExportFormat, ExportVariant } from "@/lib/exports/types";
import { getApiErrorMessage, parseJsonResponse } from "@/lib/http/response";

type DownloadChatSessionExportInput = {
  libraryId: string;
  sessionId: string;
  format: ExportFormat;
  variant: ExportVariant;
};

type DownloadContentItemExportInput = {
  libraryId: string;
  contentItemId: string;
  format: ExportFormat;
  variant: ExportVariant;
};

export async function downloadChatSessionExport(input: DownloadChatSessionExportInput): Promise<void> {
  const response = await fetch(
    `/api/libraries/${input.libraryId}/chat/sessions/${input.sessionId}/export?format=${input.format}&variant=${input.variant}`,
    {
      method: "GET",
    },
  );

  await downloadFromResponse(response, `chat-${input.variant}-export.${input.format}`);
}

export async function downloadContentItemExport(input: DownloadContentItemExportInput): Promise<void> {
  const response = await fetch(
    `/api/libraries/${input.libraryId}/content-items/${input.contentItemId}/export?format=${input.format}&variant=${input.variant}`,
    {
      method: "GET",
    },
  );

  await downloadFromResponse(response, `content-${input.variant}-export.${input.format}`);
}

async function downloadFromResponse(response: Response, fallbackFilename: string): Promise<void> {
  if (!response.ok) {
    const payload = await parseJsonResponse<{ error: string }>(response);
    throw new Error(getApiErrorMessage(payload, "Could not export right now."));
  }

  const blob = await response.blob();
  const filename =
    parseFilenameFromContentDisposition(response.headers.get("content-disposition")) ?? fallbackFilename;

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(objectUrl);
}

function parseFilenameFromContentDisposition(header: string | null): string | null {
  if (!header) {
    return null;
  }

  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const plainMatch = header.match(/filename="?([^";]+)"?/i);
  if (plainMatch?.[1]) {
    return plainMatch[1];
  }

  return null;
}
