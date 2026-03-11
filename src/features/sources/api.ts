import type { SourceListItem } from "./types";

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
  const payload = (await response.json()) as { source: SourceListItem } | { error: string };
  if (!response.ok || !("source" in payload)) {
    throw new Error("error" in payload ? payload.error : "Unable to add source.");
  }
  return payload.source;
}
