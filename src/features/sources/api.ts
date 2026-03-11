import type { SourceListItem } from "./types";

import { getApiErrorMessage, parseJsonResponse } from "@/lib/http/response";

export async function fetchSources(libraryId: string): Promise<SourceListItem[]> {
  const response = await fetch(`/api/libraries/${libraryId}/sources`);
  if (!response.ok) throw new Error("Failed to fetch sources");
  const payload = (await response.json()) as { sources: SourceListItem[] };
  return payload.sources;
}

export async function addSource(libraryId: string, url: string): Promise<SourceListItem> {
  const response = await fetch(`/api/libraries/${libraryId}/sources`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  const payload = await parseJsonResponse<{ source: SourceListItem } | { error: string }>(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload, "Could not add source. Please try again."));
  }

  if (!payload || !("source" in payload)) {
    throw new Error("Could not add source. Please try again.");
  }

  return payload.source;
}

export async function deleteSource(libraryId: string, sourceId: string): Promise<void> {
  const response = await fetch(
    `/api/libraries/${libraryId}/sources?sourceId=${encodeURIComponent(sourceId)}`,
    {
      method: "DELETE",
    },
  );

  const payload = await parseJsonResponse<{ ok: true } | { error: string }>(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload, "Could not delete source. Please try again."));
  }
}
