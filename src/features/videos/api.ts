import { getApiErrorMessage, parseJsonResponse } from "@/lib/http/response";
import type { LibraryVideosProgress } from "@/features/videos/types";

export async function fetchLibraryVideosProgress(libraryId: string): Promise<LibraryVideosProgress> {
  const response = await fetch(`/api/libraries/${libraryId}/videos`);

  const payload = await parseJsonResponse<LibraryVideosProgress | { error: string }>(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload, "Could not load video progress. Please try again."));
  }

  if (!payload || !("videos" in payload)) {
    throw new Error("Could not load video progress. Please try again.");
  }

  return payload;
}
